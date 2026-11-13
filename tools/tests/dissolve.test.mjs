import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

await import(new URL('../../assets/js/dissolve-model.js', import.meta.url));
const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../../assets/data/dissolve-subgraph.js', import.meta.url), 'utf8'), context);
const data = context.window.DISSOLVE_SUBGRAPH;
const firstGuard = data.edges.findIndex((edge) => edge.relation === 'guarded-by');
const structural = data.edges.findIndex((edge) => edge.relation !== 'guarded-by');

test('complete, partial and missing guard coverage are distinct', () => {
  const model = DissolveModel.create(data);
  assert.equal(model.summary().complete, 3);
  model.set(firstGuard, false);
  assert.equal(model.summary().complete, 2);
  assert.equal(model.summary().coverage.filter((row) => row.state === 'partial').length, 1);
  model.set(firstGuard, true);
  assert.equal(model.summary().complete, 3);
  model.removeGuards();
  assert.equal(model.summary().complete, 0);
  assert.ok(model.summary().coverage.every((row) => row.state === 'none'));
});

test('Arise restores all edges and reset is reversible', () => {
  const model = DissolveModel.create(data);
  model.all(false);
  assert.equal(model.summary().presentEdges, 0);
  for (let i = 0; i < data.edges.length; i++) model.set(i, true);
  assert.equal(model.summary().presentEdges, data.edges.length);
  assert.equal(model.summary().complete, 3);
  model.all(false);
  model.all(true);
  assert.equal(model.summary().complete, 3);
});

test('structural edges do not masquerade as guard execution', () => {
  const model = DissolveModel.create(data);
  model.set(structural, false);
  assert.equal(model.summary().complete, 3);
  assert.equal(model.summary().presentEdges, data.edges.length - 1);
  assert.throws(() => model.set(-1, false), /Unknown edge/);
});
