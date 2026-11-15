import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const root = new URL('../../../', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(JSON.stringify(value));

// Synthetic browser-contract evidence. Never a bank verification or public asset.
export async function explorerFixture() {
  const require = createRequire(import.meta.url);
  const SQL = await require(new URL('assets/vendor/sqljs/sql-wasm.js', root).pathname)({ wasmBinary: readFileSync(new URL('assets/vendor/sqljs/sql-wasm.wasm', root)) });
  const graphBytes = readFileSync(new URL('assets/data/bank-wealth.graph.sqlite', root));
  const db = new SQL.Database(graphBytes);
  const graphNodes = db.exec('SELECT id FROM nodes ORDER BY id')[0].values.map(([id]) => id);
  db.close();
  let id = sha('synthetic-explorer-browser-fixture-v1');
  const identity = 'knowledge:fixture/bankwealth/command/CreditBalance/ReserveFunds';
  const guard = 'knowledge:fixture/bankwealth/guard/CreditBalance/ReserveFunds/LEDGER_SUFFICIENT';
  const authorBytes = Buffer.from('kind: command\r\npayload:\r\n  name: ReserveFunds\r\n  description: 余额检查\r\n');
  const code = Buffer.from('// Browser fixture, not generated bank evidence\r\nval 余额 = 1\r\ncase ReserveFunds => check(余额)\r\n// <img src=x onerror=alert(1)>\r\n');
  const makeFile = (fid, path, role, bytes) => ({ id: fid, path, role, state: 'published', sha256: sha(bytes), bytes: bytes.length,
    resource: { path: 'files/' + sha(bytes) + '.txt', sha256: sha(bytes), bytes: bytes.length } });
  const files = [makeFile('generated-file', 'app/CreditBalance.scala', 'generated', code), makeFile('author-file', 'truth/reserve.structure.yaml', 'author', authorBytes),
    { id: 'withheld-file', path: 'build.sbt', role: 'generated', state: 'withheld', reason: 'local-path', sha256: sha('private fixture'), bytes: 15 }];
  const linked = ['aggregate:CreditBalance', 'command:ReserveFunds', 'slice:ReserveFunds'];
  const nodes = graphNodes.map(node => ({ id: node, identities: linked.includes(node) ? [identity] : [], pointers: linked.includes(node) ? ['/aggregates/0/commands/1'] : [], state: linked.includes(node) ? 'mapped' : 'unmapped' }));
  const sources = [{ fileId: 'author-file', pointer: '/payload', startLine: 2, endLine: 4, pointerLocated: true }];
  const identities = [{ id: identity, name: 'ReserveFunds', kind: 'command', sources, graphNodeIds: linked }, { id: guard, name: 'LEDGER_SUFFICIENT', kind: 'guard', sources, graphNodeIds: [] }];
  const start = code.indexOf('case ReserveFunds'), end = start + Buffer.byteLength('case ReserveFunds => check(余额)');
  const locations = Array.from({ length: 16 }, (_, i) => ({ id: 'location-' + i, identity, fileId: 'generated-file', precision: i === 15 ? 'file' : 'span', ...(i === 15 ? {} : { span: { start, end } }), knowledgeKey: 'source:fixture#/occurrence/' + i }));
  locations.push({ id: 'guard-location', identity: guard, fileId: 'generated-file', precision: 'span', span: { start: code.indexOf('check('), end } });
  const index = { schemaVersion: 'co-arising.explorer-index/v1', snapshot: id, nodes, identities, files, locations };
  let indexBytes = json(index);
  const manifest = { schemaVersion: 'co-arising.explorer-snapshot/v1', id, project: { name: 'Synthetic browser fixture — not bank acceptance' }, verifiedAt: '2026-11-15T00:00:00Z',
    evidence: { state: 'verified-at-export', sourceSnapshot: 'fixture-only', knowledgeSnapshot: 'fixture-only', generation: 'fixture-only', codeDigest: sha(code), toolFingerprint: 'fixture-only', exporterFingerprint: 'fixture-only', runtime: 'not-run' },
    graph: { path: 'graph.sqlite', sha256: sha(graphBytes), bytes: graphBytes.length, nodeCount: graphNodes.length, edgeCount: 413, canonicalDigest: 'fixture-only' },
    index: { path: 'index.json', sha256: sha(indexBytes), bytes: indexBytes.length },
    counts: { files: files.length, publishedFiles: 2, withheldFiles: 1, identities: 2, locations: locations.length, spanLocations: 16, mappedNodes: linked.length } };
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const { id: ignoredId, index: ignoredIndex, verifiedAt: ignoredDate, ...material } = manifest;
  const { snapshot: ignoredSnapshot, ...publicIndex } = index;
  id = sha(JSON.stringify(stable({ manifest: material, index: publicIndex })) + '\n');
  manifest.id = index.snapshot = id;
  indexBytes = json(index); manifest.index.sha256 = sha(indexBytes); manifest.index.bytes = indexBytes.length;
  const manifestBytes = json(manifest), base = '/assets/data/explorer/snapshots/' + id + '/';
  const current = { schemaVersion: 'co-arising.explorer-current/v1', state: 'available', snapshot: id, manifest: { path: 'snapshots/' + id + '/manifest.json', sha256: sha(manifestBytes), bytes: manifestBytes.length } };
  const resources = new Map([[base + 'manifest.json', manifestBytes], [base + 'index.json', indexBytes], [base + 'graph.sqlite', graphBytes], ['/assets/data/explorer/current.json', json(current)],
    ...[[files[0], code], [files[1], authorBytes]].map(([file, bytes]) => [base + file.resource.path, bytes])]);
  return { id, identity, guard, index, manifest, current, code, authorBytes, resources, base };
}
