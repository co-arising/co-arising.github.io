import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { extractExamples, commandFindings, checkExamples, BASELINE_IDS, payloadFindings, shellSyntaxFindings } from '../check-examples.mjs';

test('paired page examples are complete and source-bound', () => {
  const result = checkExamples();
  assert.deepEqual(result.errors, []);
  assert.ok(result.examples.length >= BASELINE_IDS.length);
  const ids = new Set(result.examples.map(({ id }) => id));
  for (const id of BASELINE_IDS) assert.ok(ids.has(id), `baseline example missing: ${id}`);
  assert.equal(ids.size, result.examples.length);
  assert.match(result.scope, /no CLI\/compiler\/semantic execution/);
});

test('only marked plain code is a runnable example payload', () => {
  const examples = extractExamples('<pre data-example="one"><code>left &lt; right &amp;&amp; "value"</code></pre><pre><code>unmarked</code></pre>');
  assert.equal(examples.size, 1);
  assert.equal(examples.get('one').text, 'left < right && "value"');
  assert.throws(() => extractExamples('<pre data-example="one"><code><span>not plain</span></code></pre>'), /plain escaped/);
  assert.throws(() => extractExamples('<pre data-example="one"><code>a</code></pre><pre data-example="one"><code>b</code></pre>'), /Duplicate/);
});

test('project commands require explicit config and disjoint output', () => {
  assert.equal(commandFindings('bad', 'node "$CLI" generate-project --plan').length, 2);
  assert.equal(commandFindings('indented', '  node "$CLI" generate-project --plan').length, 2);
  assert.ok(commandFindings('bad', 'truthsrc verify-project --project truthsrc.project.json --out .').some((message) => message.includes('author root')));
  assert.deepEqual(commandFindings('good', 'node "$CLI" generate-project \\\n  --project truthsrc.project.json --out generated --plan'), []);
  assert.deepEqual(commandFindings('init', 'node "$CLI" init counter-lab --format human'), []);
});

test('shell syntax is parsed without executing commands or substitutions', () => {
  assert.ok(shellSyntaxFindings('unclosed', '  node "$CLI" generate-project --project "broken --out generated').some(e => e.includes('syntax error')));
  assert.ok(shellSyntaxFindings('if', 'if true; then\n node "$CLI" --help').some(e => e.includes('syntax error')));
  assert.deepEqual(shellSyntaxFindings('never-execute', 'exit 99\n$(exit 98)\nnode --input-type=module <<\'NODE\'\nthrow new Error("must not run");\nNODE'), []);
});

test('declared CLI scans indentation, command boundaries and unknown verbs', () => {
  assert.ok(commandFindings('unknown', '  node "$TRUTHSRC_CLI" genrate-project --project p.json --out generated').some(e => e.includes('unknown')));
  assert.equal(commandFindings('two', 'node "$CLI" verify-project; node "$CLI" status-project --project p.json --out generated').filter(e => e.includes('missing')).length, 2);
  assert.deepEqual(commandFindings('spaces', 'node "$CLI" generate-project --project "path with spaces/p.json" --out "separate output"'), []);
  assert.deepEqual(commandFindings('equals', 'truthsrc verify-project --project=p.json --out=generated'), []);
  assert.ok(commandFindings('root', 'truthsrc verify-project --project=p.json --out=./').some(e => e.includes('author root')));
  assert.ok(commandFindings('unsupported', 'truthsrc query-project --project p.json --out generated --symbol Foo').some(e => e.includes('unsupported')));
});

test('malformed marked blocks cannot silently disappear from extraction', () => {
  assert.throws(() => extractExamples('<pre data-example="missing-code">text</pre>'), /plain escaped/);
  assert.throws(() => extractExamples('<pre data-example="Bad ID"><code>x</code></pre>'), /Malformed/);
  assert.equal(extractExamples("<pre data-example='valid-id'><code class='language-json'>{&quot;a&quot;:1}</code></pre>").get('valid-id').text, '{"a":1}');
});

test('JSON grammar is opt-in for compiled fragments, never arbitrary author JSON', () => {
  const sample = (text, attributes) => ({ text, attributes });
  assert.deepEqual(payloadFindings('fold', sample('{"slot":"count","expr":"event.count"}', { 'data-example-kind': 'compiled-fragment', 'data-grammar': 'json' })), []);
  assert.ok(payloadFindings('bad-fold', sample('{"slot":}', { 'data-example-kind': 'compiled-fragment', 'data-grammar': 'json' })).some(e => e.includes('JSON syntax')));
  assert.ok(payloadFindings('tree', sample('{}', { 'data-grammar': 'json' })).some(e => e.includes('requires a marked compiled-fragment')));
  assert.deepEqual(payloadFindings('author', sample('payload:\n  {"guards": ["expr"]}', { 'data-example-kind': 'author' })), []);
  assert.deepEqual(payloadFindings('proposal', sample('count <- proposed(event.count)', { 'data-example-kind': 'proposal' })), []);
  assert.ok(payloadFindings('counter-fold-ir', sample('{bad}', {})).some(e => e.includes('JSON syntax')));
});

test('source SHA drift is rejected and optional source comparison is read-only and symlink-bounded', () => {
  const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
  const temporary = mkdtempSync(join(tmpdir(), 'co-arising-example-test-'));
  try {
    for (const prefix of ['', 'zh/']) for (const route of ['', 'why-co-arising/', 'guide/', 'dsl/', 'pipeline/', 'bank-demo/', 'explorer/', 'compare/', 'status/']) {
      const file = join(temporary, prefix, route, 'index.html');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, readFileSync(join(sourceRoot, prefix, route, 'index.html')));
    }
    const dsl = join(temporary, 'dsl/index.html');
    const sample = extractExamples(readFileSync(dsl, 'utf8')).get('initialize-account-file');
    const checkout = join(temporary, 'source-fixture');
    const source = join(checkout, sample.attributes['data-source-file']);
    mkdirSync(dirname(source), { recursive: true });
    writeFileSync(source, sample.text);
    const before = statSync(source);
    const result = checkExamples(temporary, checkout);
    assert.ok(result.examples.find(e => e.id === 'initialize-account-file').sourceChecked);
    assert.equal(readFileSync(source, 'utf8'), sample.text);
    assert.equal(statSync(source).mtimeMs, before.mtimeMs);
    assert.ok(!result.errors.some(e => e.startsWith('initialize-account-file:')));

    const zh = join(temporary, 'zh/dsl/index.html');
    writeFileSync(zh, readFileSync(zh, 'utf8').replace(sample.attributes['data-source-sha256'], '0'.repeat(64)));
    const drift = checkExamples(temporary);
    assert.ok(drift.errors.some(e => e.includes('captured source fingerprint')));
    assert.ok(drift.errors.some(e => e.includes('data-source-sha256 differs')));

    const outside = join(temporary, 'outside-source.yaml');
    writeFileSync(outside, sample.text);
    rmSync(source);
    symlinkSync(outside, source);
    assert.ok(checkExamples(temporary, checkout).errors.some(e => e.includes('source path escapes bank root')));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
