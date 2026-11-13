import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyCounterChange } from '../verify-counter-change.mjs';

const cli = process.env.TRUTHSRC_CLI;
test('public CLI Counter boundary check and independent negative controls', {
  skip: cli ? false : 'Set TRUTHSRC_CLI to a complete local CLI; no install/network fallback',
}, async t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'portal-counter-change-'));
  t.diagnostic(`Self-owned fixture retained at ${root}`);
  const projectRoot = join(root, 'counter-lab');
  execFileSync(process.execPath, [cli, 'init', projectRoot, '--format', 'json'], { encoding: 'utf8' });
  const project = join(projectRoot, 'truthsrc.project.json');
  const file = join(projectRoot, 'truth/example/contexts/example/aggregates/counter/slices/set-count.slice.yaml');
  const baseline = readFileSync(file, 'utf8');
  const oldCondition = '"cond": "param.count >= 0"';
  assert.equal(baseline.split(oldCondition).length, 2, 'Expected the actual existing count guard once');
  const changed = baseline.replace(oldCondition, '"cond": "param.count >= 0 && param.count <= 100"');
  await t.test('unchanged scaffold fails the prewritten 101 expectation', async () => {
    await assert.rejects(verifyCounterChange({ cli, project }), /count=101/);
    assert.equal(readFileSync(file, 'utf8'), baseline);
  });
  await t.test('approved inclusive range passes all four cases without source writes', async () => {
    writeFileSync(file, changed);
    const result = await verifyCounterChange({ cli, project });
    assert.deepEqual(result.cases.map(c => [c.count, c.outcome]), [
      ['-1', 'reject'], ['0', 'continue'], ['100', 'continue'], ['101', 'reject'],
    ]);
    assert.equal(result.generatedScalaExecuted, false);
    assert.equal(result.bankAcceptance, false);
    assert.equal(readFileSync(file, 'utf8'), changed);
  });
  await t.test('off-by-one mutation fails the independent 100 expectation', async () => {
    writeFileSync(file, changed.replace('param.count <= 100', 'param.count < 100'));
    await assert.rejects(verifyCounterChange({ cli, project }), /count=100/);
  });
  await t.test('incorrect event binding is detected, not just guard arithmetic', async () => {
    writeFileSync(file, changed.replace('"expr": "param.count"', '"expr": "literal:0"'));
    await assert.rejects(verifyCounterChange({ cli, project }), /CountSet payload for count=100/);
  });
  writeFileSync(file, changed);
});
