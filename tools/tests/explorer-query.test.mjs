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
const { execute, PRESETS, LIMITS, NODE_LIMITS } = globalThis.ExplorerQuery;
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

const directory = (fields = {}) => execute(SQL, bytes, { mode: 'directory', ...fields });
const inspect = (id) => execute(SQL, bytes, { mode: 'inspect', id });
const stored = (sql, values = []) => {
  const db = new SQL.Database(bytes);
  const statement = db.prepare(sql);
  try {
    statement.bind(values);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally { statement.free(); db.close(); }
};

test('directory covers all 389 exact identities, with real kinds and 40-node pages', () => {
  const first = directory();
  assert.equal(NODE_LIMITS.pageSize, 40);
  assert.equal(first.total, 389);
  assert.equal(first.filtered, 389);
  assert.equal(first.pageCount, 10);
  assert.equal(first.nodes.length, 40);
  assert.deepEqual(first.kinds, stored('SELECT kind,COUNT(*) AS count FROM nodes GROUP BY kind ORDER BY kind'));
  assert.equal(first.kinds.length, 16);
  const nodes = [];
  for (let page = 0; page < first.pageCount; page++) {
    const data = directory({ page });
    assert.equal(data.page, page);
    assert.equal(data.nodes.length, page === 9 ? 29 : 40);
    assert.equal(data.disposable, true);
    nodes.push(...data.nodes);
  }
  assert.deepEqual(nodes, stored('SELECT id,kind,name FROM nodes ORDER BY id'));
  assert.equal(new Set(nodes.map((node) => node.id)).size, 389);
  assert.equal(directory({ page: Number.MAX_SAFE_INTEGER }).page, 9);
});

test('directory combines literal ID/name search and exact kind, without alias merging', () => {
  const result = directory({ search: 'cancelincomingcredit', kind: 'command' });
  assert.equal(result.filtered, 2);
  assert.deepEqual(result.nodes.map((node) => node.id), ['command:CancelIncomingCredit', 'command:CreditBalance.CancelIncomingCredit']);
  assert.equal(new Set(result.nodes.map((node) => node.name)).size, 1);
  assert.equal(directory({ kind: 'command' }).filtered, 55);
  const literal = directory({ search: '%' });
  assert.equal(literal.filtered, 0);
  assert.equal(directory({ search: 'no-such-node', page: 90 }).page, 0);
  const empty = directory({ kind: 'bogus' });
  assert.equal(empty.total, 389);
  assert.equal(empty.filtered, 0);
  assert.equal(empty.pageCount, 0);
  assert.deepEqual(empty.nodes, []);
});

test('structured requests only accept constrained fields and cannot supply SQL', () => {
  for (const request of [
    { mode: 'directory', sql: 'DELETE FROM nodes' },
    { mode: 'directory', pageSize: 1000 },
    { mode: 'directory', search: [] },
    { mode: 'directory', search: '字'.repeat(400) },
    { mode: 'directory', kind: 'k'.repeat(257) },
    ...[-1, 1.5, Infinity, '0', Number.MAX_SAFE_INTEGER + 1].map((page) => ({ mode: 'directory', page })),
    { mode: 'inspect', id: ['aggregate:CreditBalance'] },
    { mode: 'inspect', id: 'x'.repeat(8193) },
    { mode: 'inspect', id: 'x', sql: 'SELECT 1' },
    { mode: 'inspect' }, null, [],
  ]) assert.throws(() => execute(SQL, bytes, request), /structured|page|mode/);
});

test('quoted/injection-like full IDs are bound as data, unknown, and cannot corrupt later jobs', () => {
  const before = createHash('sha256').update(bytes).digest('hex');
  for (const id of ["aggregate:CreditBalance' OR 1=1 --", "x'; DELETE FROM nodes; --", 'event:<img src=x onerror=alert(1)>']) {
    assert.equal(inspect(id).node, null);
    assert.equal(directory({ search: id }).filtered, 0);
    assert.equal(directory({ kind: id }).filtered, 0);
  }
  assert.equal(directory().total, 389);
  assert.equal(inspect('aggregate:CreditBalance').node.id, 'aggregate:CreditBalance');
  run('DELETE FROM edges; DELETE FROM nodes;');
  assert.equal(directory().total, 389);
  assert.ok(inspect('aggregate:CreditBalance').outgoing.total > 0);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), before);
  assert.equal(preset('blast').tables[0].rows.length, 55);
});

test('inspector returns real incoming/outgoing SQL adjacency, including legitimate empty nodes', () => {
  for (const id of ['aggregate:CreditBalance', 'event:SipInstallmentFailed', 'slice:ReserveFunds', 'story:CashFundPurchase']) {
    const data = inspect(id);
    assert.deepEqual({ id: data.node.id, kind: data.node.kind, name: data.node.name }, stored('SELECT id,kind,name FROM nodes WHERE id=?', [id])[0]);
    for (const [direction, from, other] of [['outgoing', 'from_id', 'to_id'], ['incoming', 'to_id', 'from_id']]) {
      const expected = stored(`SELECT e.seq,e.relation,e.${other} AS id,n.kind,n.name FROM edges e LEFT JOIN nodes n ON n.id=e.${other} WHERE e.${from}=? ORDER BY e.seq`, [id]);
      assert.equal(data[direction].total, expected.length);
      assert.deepEqual(data[direction].edges, expected.slice(0, NODE_LIMITS.edges));
    }
  }
  const empty = inspect('story:CashFundPurchase');
  assert.equal(empty.incoming.total, 0);
  assert.equal(empty.outgoing.total, 0);
  assert.equal(inspect('not:a-node').node, null);
  assert.equal(inspect('command:CreditBalance.CancelIncomingCredit').node.extra[0].field, 'extra.qualifiedRef');
  assert.notEqual(inspect('command:CreditBalance.CancelIncomingCredit').node.id, inspect('command:CancelIncomingCredit').node.id);
});

test('enrichment is stored provenance only; canonical graphstore has no code anchors', () => {
  const data = inspect('aggregate:CreditBalance');
  assert.equal(data.representation, 'canonical graphstore');
  assert.equal(data.codeAnchors, 'unavailable');
  const atom = JSON.parse(stored('SELECT atom FROM nodes WHERE id=?', [data.node.id])[0].atom);
  for (const field of data.node.provenance) {
    const path = field.field.split('.').slice(1);
    const raw = path.reduce((value, key) => value[key], atom);
    assert.equal(field.value, typeof raw === 'string' ? raw : JSON.stringify(raw));
  }
  assert.ok(data.node.provenance.some((row) => row.field === 'atom.provenance.workshopHeld' && row.value === 'false'));
  assert.deepEqual(inspect('event:SipInstallmentFailed').node.provenance, []);
  assert.equal(Object.hasOwn(data.node, 'file'), false);
  assert.equal(Object.hasOwn(data.node, 'line'), false);
  assert.equal(Object.hasOwn(data.node, 'url'), false);
  assert.equal(data.node.atomTruncated, true);
  assert.ok(data.notices.includes('cell'));
  assert.ok(Buffer.byteLength(data.node.atom) <= 8192);
  assert.equal(data.node.atom.includes('�'), false);
  assert.ok(Buffer.byteLength(JSON.stringify(data)) <= LIMITS.responseBytes);
});

test('every stored node can be inspected within structured response and cell budgets', () => {
  for (const { id } of stored('SELECT id FROM nodes ORDER BY id')) {
    const data = inspect(id);
    assert.equal(data.node.id, id);
    assert.ok(data.outgoing.edges.length <= NODE_LIMITS.edges);
    assert.ok(data.incoming.edges.length <= NODE_LIMITS.edges);
    assert.ok(Buffer.byteLength(data.node.atom) <= LIMITS.cellBytes);
    assert.ok(Buffer.byteLength(JSON.stringify(data)) <= LIMITS.responseBytes);
  }
});
