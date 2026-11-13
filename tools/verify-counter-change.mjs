#!/usr/bin/env node
// Fixed toy expectations against freshly CLI-admitted products. No Scala execution.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Written before changing the rule; never computed from the predicate or its output.
const CASES = Object.freeze([
  { count: '-1', kind: 'reject', errCode: 'NEGATIVE_COUNT' },
  { count: '0', kind: 'continue', next: '0' },
  { count: '100', kind: 'continue', next: '100' },
  { count: '101', kind: 'reject', errCode: 'NEGATIVE_COUNT' },
]);
const ref = (kind, owner, id) => ({ context: 'example', kind, owner, id });
const stateRef = id => ref('state-field', ['Counter'], id);
const paramRef = id => ref('parameter', ['Counter', 'SetCount'], id);
const get = (map, wanted) => [...map].find(([key]) => JSON.stringify(key) === JSON.stringify(wanted))?.[1];

export async function verifyCounterChange({ cli, project }) {
  assert.ok(cli && isAbsolute(cli), 'TRUTHSRC_CLI must name the complete CLI by absolute path');
  assert.ok(project && isAbsolute(project), '--project must be an absolute path to your own Counter config');
  const actualCli = realpathSync(cli);
  const packageRoot = dirname(dirname(actualCli));
  // These documented pure oracles ship in the same package as the CLI. No checkout/test imports.
  const moduleAt = path => import(pathToFileURL(resolve(packageRoot, path)).href);
  const [{ evaluateDecisions }, { evaluateValue }, { evaluateFolds }] = await Promise.all([
    moduleAt('lib/domain-products/decision.mjs'),
    moduleAt('lib/domain-products/values.mjs'),
    moduleAt('lib/domain-products/folds.mjs'),
  ]);
  // compile-project accepts --project, not --out; it returns fresh admitted products without
  // writing generated code. Generation/update/verify are separate guide steps.
  const compiled = JSON.parse(execFileSync(process.execPath, [actualCli, 'compile-project',
    '--project', project, '--format', 'json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  assert.deepEqual(compiled.compilation.diagnostics, []);
  assert.ok(compiled.compilation.result, 'No admitted product set');
  const aggregate = compiled.canonical.aggregates;
  assert.equal(aggregate.length, 1, 'This exercise is only the single Counter, never bank acceptance');
  assert.equal(aggregate[0].name, 'Counter');
  assert.equal(aggregate[0].context, 'example');
  assert.deepEqual(aggregate[0].commands.map(c => c.name), ['SetCount']);
  assert.deepEqual(aggregate[0].events.map(e => e.name), ['CountSet']);
  const product = (id, version) => {
    const matches = compiled.compilation.result.products.filter(p => p.id === id);
    assert.equal(matches.length, 1, `Missing/duplicate ${id}`);
    assert.equal(matches[0].version, version, `Unsupported ${id} profile; do not silently upgrade this check`);
    return matches[0].payload;
  };
  const layout = product('reference-layout', '1');
  const types = product('exact-value-types', '1');
  const decisions = product('domain-decision', '4');
  const dependencies = product('domain-dependencies', '6');
  const folds = product('domain-folds', '6');
  assert.deepEqual(types, []);
  assert.deepEqual(dependencies.hosts, []);
  assert.deepEqual(dependencies.externalProducers, []);
  assert.equal(decisions.commands.length, 1);
  assert.equal(dependencies.commands.length, 1);
  assert.equal(folds.events.length, 1);
  const command = decisions.commands[0];
  assert.deepEqual(command.decisions.map(d => [d.ruleId, d.onFalse]), [
    ['nonempty-id', { kind: 'reject', errCode: 'EMPTY_ID' }],
    ['nonnegative-count', { kind: 'reject', errCode: 'NEGATIVE_COUNT' }],
  ], 'Keep the existing guard order, identity and error policy');
  const emission = dependencies.commands[0].events;
  assert.equal(emission.length, 1);
  assert.deepEqual(emission[0].event, ref('event', ['Counter'], 'CountSet'));
  assert.deepEqual(emission[0].slots.map(s => s.slot.id), ['id', 'count']);
  const observations = [];
  for (const expected of CASES) {
    const oldState = new Map([[stateRef('id'), 'toy-counter'], [stateRef('count'), '2']]);
    const oldBytes = JSON.stringify([...oldState]);
    const inputs = new Map([...oldState, [paramRef('id'), 'toy-counter'], [paramRef('count'), expected.count]]);
    const outcome = evaluateDecisions(command, inputs, layout, { types }, '4');
    assert.deepEqual(outcome, expected.kind === 'reject'
      ? { kind: 'reject', errCode: expected.errCode } : { kind: 'continue' }, `count=${expected.count}`);
    // A reject stops before emission. For continue, evaluate the admitted bindings, then
    // replay with state + event only: command inputs are deliberately absent from replay.
    if (outcome.kind === 'continue') {
      const slots = emission[0].slots.map(s => [s.slot,
        evaluateValue(s.producer, command.command, inputs, layout, [], types)]);
      assert.deepEqual(slots.map(([r, v]) => [r.id, v]), [['id', 'toy-counter'], ['count', expected.next]],
        `CountSet payload for count=${expected.count}`);
      const next = evaluateFolds(folds.events[0], new Map([...oldState, ...slots]), layout, types);
      assert.equal(get(next, stateRef('count')), expected.next, `fold for count=${expected.count}`);
      assert.equal(get(next, stateRef('id')), 'toy-counter');
    }
    assert.equal(JSON.stringify([...oldState]), oldBytes, 'Oracle mutated pre-event state');
    observations.push({ count: expected.count, outcome: outcome.kind,
      ...(outcome.errCode ? { errCode: outcome.errCode } : { event: 'CountSet', nextCount: expected.next }) });
  }
  return { scope: 'Counter admitted-product oracle only', cases: observations,
    generatedScalaExecuted: false, bankAcceptance: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    assert.ok(args.length === 2 && args[0] === '--project',
      'Usage: TRUTHSRC_CLI=/absolute/bin/truthsrc.js node verify-counter-change.mjs --project /absolute/counter-lab/truthsrc.project.json');
    console.log(JSON.stringify(await verifyCounterChange({ cli: process.env.TRUTHSRC_CLI, project: args[1] }), null, 2));
  } catch (error) {
    console.error(`Counter check failed (no business approval or runtime claim): ${error.message}`);
    process.exitCode = 1;
  }
}
