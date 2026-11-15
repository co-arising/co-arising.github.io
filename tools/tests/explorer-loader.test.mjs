import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { explorerFixture } from './fixtures/explorer-fixture.mjs';
await import('../../assets/js/explorer-snapshot.js');
const api = globalThis.ExplorerSnapshot;
const fixture = await explorerFixture();
function fetcher(resources = fixture.resources) {
  const calls = [];
  const fetch = async path => {
    calls.push(path);
    const data = resources.get(path);
    return { ok: !!data, status: data ? 200 : 404, headers: new Headers(), arrayBuffer: async () => Uint8Array.from(data).buffer };
  };
  return { fetch, calls };
}
test('verified resources load lazily; every occurrence and withheld file survives', async () => {
  const transport = fetcher();
  const loaded = await api.load({ ...transport, crypto: webcrypto });
  assert.equal(loaded.state, 'ready');
  assert.equal(loaded.byIdentity.get(fixture.identity).length, 16);
  assert.equal(loaded.index.files.length, 3);
  assert.equal(transport.calls.some(p => p.includes('/files/')), false);
  const file = await loaded.loadFile('generated-file');
  assert.deepEqual(Buffer.from(file.bytes), fixture.code);
  assert.equal(file.ranges.length, 5);
  assert.deepEqual(api.spanLines(file.ranges, fixture.index.locations[0].span), [3]);
  const reverse = loaded.reverse(file.file.id, file.ranges, 3);
  assert.equal(reverse.precision, 'span');
  assert.equal(reverse.locations.length, 16);
  assert.deepEqual(new Set(reverse.locations.map(l => l.identity)), new Set([fixture.identity, fixture.guard]));
  assert.equal(loaded.reverse(file.file.id, file.ranges, 1).precision, 'file');
  assert.equal(loaded.reverse(file.file.id, file.ranges, 5).precision, 'file');
  assert.throws(() => loaded.reverse(file.file.id, file.ranges, 999), /Invalid source line/);
  await loaded.loadFile('generated-file');
  assert.equal(transport.calls.filter(p => p.includes('/files/')).length, 1);
  await assert.rejects(loaded.loadFile('withheld-file'), /withheld/);
  assert.equal(transport.calls.filter(p => p.includes('/files/')).length, 1);
});
test('cancelled page lifetime never starts another snapshot fetch', async () => {
  const controller = new AbortController(); controller.abort();
  const transport = fetcher();
  await assert.rejects(api.load({ ...transport, crypto: webcrypto, signal: controller.signal }), /cancelled/);
  assert.equal(transport.calls.length, 0);
});

test('explicit snapshot does not use current pointer or silently fall back', async () => {
  const transport = fetcher();
  await api.load({ ...transport, crypto: webcrypto, snapshot: fixture.id });
  assert.equal(transport.calls.some(p => p.endsWith('/current.json')), false);
  await assert.rejects(api.load({ ...fetcher(), crypto: webcrypto, snapshot: 'f'.repeat(64) }), /unavailable/);
  await assert.rejects(api.load({ ...fetcher(), crypto: webcrypto, snapshot: '../../private' }), /Invalid requested/);
});
test('unpublished pointer is explicitly unavailable, not a verified empty index', async () => {
  const resources = new Map([['/assets/data/explorer/current.json', Buffer.from(JSON.stringify({ schemaVersion: 'co-arising.explorer-current/v1', state: 'unavailable', reason: 'matched-project-required' }))]]);
  const transport = fetcher(resources);
  const result = await api.load({ ...transport, crypto: webcrypto });
  assert.equal(result.state, 'unavailable'); assert.equal(transport.calls.length, 1);
});
test('modified manifest/index/code bytes fail closed', async () => {
  for (const path of [fixture.base + 'manifest.json', fixture.base + 'index.json']) {
    const resources = new Map(fixture.resources);
    resources.set(path, Buffer.concat([resources.get(path), Buffer.from(' ')]));
    await assert.rejects(api.load({ ...fetcher(resources), crypto: webcrypto }), /byte\/hash mismatch/);
  }
  const resources = new Map(fixture.resources), file = fixture.index.files[0];
  resources.set(fixture.base + file.resource.path, Buffer.from('tampered'));
  const loaded = await api.load({ ...fetcher(resources), crypto: webcrypto });
  await assert.rejects(loaded.loadFile(file.id), /byte\/hash mismatch/);
});
test('explicit snapshots authenticate their content-derived ID, not only child hashes', async () => {
  const resources = new Map(fixture.resources);
  const altered = structuredClone(fixture.manifest);
  altered.project.name = 'Different material under the old snapshot ID';
  resources.set(fixture.base + 'manifest.json', Buffer.from(JSON.stringify(altered)));
  await assert.rejects(api.load({ ...fetcher(resources), crypto: webcrypto, snapshot: fixture.id }), /Public snapshot digest mismatch/);
});

test('schema, refs, precision, counts and path traversal are validated', () => {
  const mutations = [
    i => { i.snapshot = 'f'.repeat(64); },
    i => { i.locations[0].identity = 'missing'; },
    i => { i.locations[0].span.end = 100000; },
    i => { i.locations[15].span = { start: 0, end: 1 }; },
    i => { i.nodes[0].identities = ['missing']; },
    i => { i.files[0].resource.path = '../private'; },
    i => { i.files[0].path = '/Users/private/key'; },
    i => { i.files[0].resource.path = 'files/%2e%2e'; },
    i => { i.files[2].resource = i.files[0].resource; },
    i => { i.identities[1].graphNodeIds = ['aggregate:CreditBalance']; },
    i => { i.locations.push(i.locations[0]); },
    i => { i.identities[0].relations = [{ identity: 'missing', carrier: 'guess' }]; },
  ];
  for (const mutate of mutations) { const index = structuredClone(fixture.index); mutate(index); assert.throws(() => api.validateIndex(index, fixture.manifest)); }
  for (const path of ['/etc/passwd', '../private', 'a/../x', 'a\\x', 'a/%2e', '//evil', 'http:evil', 'a#x', 'a?x', 'a\0x']) assert.equal(api.safePath(path), false, path);
});
test('UTF-8 line mapping honors CRLF and exclusive end, preserving byte offsets', () => {
  const bytes = Buffer.from('中\r\n😀\nlast');
  const ranges = api.lineRanges(bytes);
  assert.deepEqual(ranges, [{ start: 0, end: 5 }, { start: 5, end: 10 }, { start: 10, end: 14 }]);
  assert.deepEqual(api.spanLines(ranges, { start: 5, end: 9 }), [2]);
  assert.deepEqual(api.spanLines(ranges, { start: 0, end: 5 }), [1]);
});
test('routes preserve qualified ids, snapshot and language while dropping SQL', () => {
  const link = api.link('/zh/explorer/?node=aggregate%3ACreditBalance&SQL=secret&flow=cash#nodes', { snapshot: fixture.id, view: 'code', file: 'generated-file', knowledge: fixture.identity, line: 3 });
  const state = api.route(link);
  assert.equal(state.snapshot, fixture.id); assert.equal(state.knowledge, fixture.identity); assert.equal(state.line, 3);
  assert.equal(state.node, 'aggregate:CreditBalance'); assert.equal(link.includes('secret'), false); assert.ok(link.startsWith('/zh/explorer/'));
  const back = api.link(link, { view: 'graph', file: null, line: null });
  assert.equal(api.route(back).file, undefined); assert.ok(back.endsWith('#nodes'));
});
