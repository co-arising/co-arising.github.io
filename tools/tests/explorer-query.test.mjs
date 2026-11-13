import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const require = createRequire(import.meta.url);
const init = require(new URL('assets/vendor/sqljs/sql-wasm.js', root).pathname);
const SQL = await init({ wasmBinary: readFileSync(new URL('assets/vendor/sqljs/sql-wasm.wasm', root)) });
await import(new URL('assets/js/explorer-query.js', root));
const { execute, PRESETS, LIMITS } = globalThis.ExplorerQuery;
const bytes = readFileSync(new URL('assets/data/bank-wealth.graph.sqlite', root));
const run = (sql) => execute(SQL, bytes, { mode: 'sandbox', sql });
const preset = (key) => execute(SQL, bytes, { mode: 'preset', key });

test('all seven fixed presets execute on the shipped graph', () => {
  assert.equal(Object.keys(PRESETS).length, 7);
  for (const key of Object.keys(PRESETS)) {
    const result = preset(key);
    assert.ok(result.tables.length, key);
    assert.equal(result.disposable, true);
  }
  const blast = preset('blast').tables[0];
  assert.equal(blast.rows.length, 55);
  assert.ok(blast.rows.every((row) => Number(row[2]) <= 3));
  assert.deepEqual([...new Set(blast.rows.map((row) => row[0]))].sort(), ['aggregate', 'command', 'event', 'slice']);
  assert.equal(preset('lineage').tables[0].rows.length, 51);
  const orphans = preset('orphans').tables[0].rows;
  assert.equal(orphans.length, 23);
  assert.equal(new Set(orphans.map((row) => row[1])).size, 13);
});

test('sandbox modifications affect neither originals nor the next query', () => {
  const before = createHash('sha256').update(bytes).digest('hex');
  const changed = run('DELETE FROM nodes; SELECT COUNT(*) AS n FROM nodes;');
  assert.equal(changed.tables[0].rows[0][0], '0');
  assert.equal(run('SELECT COUNT(*) AS n FROM nodes').tables[0].rows[0][0], '389');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), before);
  assert.equal(preset('blast').tables[0].rows.length, 55);
});

test('real SQL predicates, empty columns and syntax failures are preserved', () => {
  const empty = run('SELECT id FROM nodes WHERE 1=0').tables[0];
  assert.deepEqual(empty.cols, ['id']);
  assert.deepEqual(empty.rows, []);
  assert.equal(run('SELECT id FROM nodes LIMIT 1').tables[0].rows.length, 1);
  assert.throws(() => run('THIS IS NOT SQL'), /syntax/i);
  assert.throws(() => run(''), /Enter a SQL/);
  assert.throws(() => run(' '.repeat(LIMITS.sqlBytes + 1)), /16 KiB/);
  assert.throws(() => execute(SQL, bytes, { mode: 'preset', key: '__proto__' }), /Unknown/);
});

test('row, column, result-set and cell budgets report truncation', () => {
  const rows = run('SELECT id FROM nodes; SELECT 999;');
  assert.equal(rows.tables[0].rows.length, 200);
  assert.ok(rows.notices.includes('rows'));
  assert.equal(rows.tables.length, 1);
  const columns = run('SELECT ' + Array.from({ length: 33 }, (_, i) => `${i} AS c${i}`).join(','));
  assert.equal(columns.tables[0].cols.length, 32);
  assert.ok(columns.notices.includes('columns'));
  const sets = run('SELECT 1;SELECT 2;SELECT 3;SELECT 4;SELECT 5;');
  assert.equal(sets.tables.length, 4);
  assert.ok(sets.notices.includes('sets'));
  const cell = run("SELECT replace(hex(zeroblob(5000)), '0', '字') AS long_text");
  assert.ok(cell.notices.includes('cell'));
  assert.ok(Buffer.byteLength(cell.tables[0].rows[0][0]) <= LIMITS.cellBytes);
  const boundary = run("SELECT '" + 'a'.repeat(8187) + "字字' AS boundary").tables[0].rows[0][0];
  assert.ok(Buffer.byteLength(boundary) <= LIMITS.cellBytes);
  assert.equal(boundary.includes('�'), false);
});

test('response budget is bounded before table transfer', () => {
  const result = run("SELECT replace(hex(zeroblob(4000)), '0', 'x') FROM nodes");
  assert.ok(result.notices.includes('bytes'));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= LIMITS.responseBytes);
});

test('signed 64-bit integers are not rounded through JavaScript Number', () => {
  assert.equal(run('SELECT 9223372036854775807 AS exact').tables[0].rows[0][0], '9223372036854775807');
});
