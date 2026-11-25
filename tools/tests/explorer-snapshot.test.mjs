import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { assertPublicCoverage, buildSnapshot, loadTool, parseArgs } from '../export-explorer-snapshot.mjs';
import { buildExplorerGraphBridge } from '../explorer-graph-bridge.mjs';
import { REQUIRED_CHECKS, descriptor, publicSnapshotId, validateSnapshotBundle } from '../explorer-snapshot-contract.mjs';
import { assertDestination, jsonBytes, plainPath, safePath, sha256, sensitiveReason, stable, verifySpan } from '../explorer-snapshot-security.mjs';

const dir = dirname(fileURLToPath(import.meta.url)), cli = join(dir, '../export-explorer-snapshot.mjs');
const tool = process.env.EXPLORER_TOOL;
const consumer = process.env.EXPLORER_CONSUMER;
const sha = value => 'sha256:' + sha256(Buffer.from(value));
const temp = t => { const root = mkdtempSync(join(realpathSync(tmpdir()), 'explorer-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };
const resolveSourcePointer = (index, pointer) => index.records.filter(row => row.pointer === pointer).map(row => ({ ...row }));
const fakeLibs = {
  validateSourceIndex: index => assert.ok(Array.isArray(index.records)),
  resolveRecordSource: (_index, row) => ({ ...row }), resolveSourcePointer,
  authorExcerpt: (_text, pointer) => ({ pointerLocated: pointer === '/payload', startLine: 1, endLine: 2 }),
  declaredViewRelations: (_canonical, index) => ({ edges: [{ from: index.records[1].identity, to: index.records[2].identity, proof: { carrier: 'guards/0' } }] }),
};
function fixture(t) {
  const root = temp(t), command = { name: 'Reserve', guards: [{ id: 'POSITIVE' }] };
  const canonical = { workshop: 'Fixture', aggregates: [{ name: 'Balance', commands: [command], events: [] }] };
  const records = [
    { pointer: '/aggregates/0', identity: 'knowledge:fixture/context/aggregate/Balance', kind: 'aggregate', name: 'Balance' },
    { pointer: '/aggregates/0/commands/0', identity: 'knowledge:fixture/context/command/Balance/Reserve', kind: 'command', name: 'Reserve' },
    { pointer: '/aggregates/0/commands/0/guards/0', identity: 'knowledge:fixture/context/guard/Balance/Reserve/POSITIVE', kind: 'guard', name: 'POSITIVE' },
  ].map(row => ({ ...row, file: 'structure.yaml', atomPointer: '/payload', surface: '', relation: 'direct' }));
  const sourceIndex = { schemaVersion: 'truthsrc.source-index/v1', snapshot: sha(JSON.stringify(canonical)), records };
  const graph = { canonical, nodes: new Map([
    ['aggregate:Balance', { id: 'aggregate:Balance', kind: 'aggregate', name: 'Balance', atom: canonical.aggregates[0] }],
    ['command:Reserve', { id: 'command:Reserve', kind: 'command', name: 'Reserve', atom: command }],
    ['slice:Reserve', { id: 'slice:Reserve', kind: 'slice', name: 'Reserve', atom: command }],
    ['field:unknown', { id: 'field:unknown', kind: 'field', name: 'unknown', atom: null }],
  ]), edges: [], diagnostics: [] };
  const graphFile = join(root, 'fixture.sqlite'), db = new DatabaseSync(graphFile);
  db.exec('CREATE TABLE canonical (value TEXT)'); db.prepare('INSERT INTO canonical VALUES (?)').run(JSON.stringify(canonical)); db.close();
  const graphBytes = readFileSync(graphFile);
  const content = Buffer.from('αβ\r\n' + 'line\n'.repeat(20) + '<script>not executed</script>\n');
  const buffers = new Map([['app/Example.scala', content], ['build.sbt', Buffer.from('repository := "file:///Users/private/m2"\n')]]);
  const anchor = span => ({ file: 'app/Example.scala', fingerprint: sha256(content).replace(/^/, 'sha256:'), status: 'source-verified',
    verification: { fileVerified: true, spanVerified: !!span }, ...(span ? { span } : {}) });
  const keys = records.map(row => 'source:fixture#' + row.pointer);
  const anchors = { anchors: {
    [keys[0]]: [anchor()],
    [keys[1]]: Array.from({ length: 15 }, (_, i) => { const start = i === 0 ? 0 : 6 + (i - 1) * 5; const end = i === 0 ? 4 : start + 4;
      return anchor({ start, end, text: content.subarray(start, end).toString('utf8') }); }),
    [keys[2]]: [anchor({ start: 0, end: 2, text: 'α' }), anchor({ start: content.length - 1, end: content.length, text: '\n' })],
  } };
  const origins = key => resolveSourcePointer(sourceIndex, key.slice('source:fixture#'.length));
  const query = {
    origins,
    forward: key => [{ knowledge: key, origins: origins(key), locations: anchors.anchors[key] }],
    reverse: file => Object.entries(anchors.anchors).flatMap(([knowledge, rows]) => rows.filter(row => row.file === file)
      .map(location => ({ knowledge, location, origins: origins(knowledge) }))),
  };
  const author = Buffer.from('kind: structure\npayload: {"name":"Reserve"}\n'), absoluteFile = join(root, 'truth/structure.yaml');
  const captured = { canonical, tree: join(root, 'truth'), sourceIndex, config: { canonicalId: 'fixture', context: 'context' },
    sources: [{ role: 'tool', root: '/tool', sha256: 'a'.repeat(64) }, { role: 'tree', file: absoluteFile, bytes: author.length, sha256: sha256(author) }] };
  const result = { schemaVersion: 'truthsrc.project-verification/v1', passed: true, snapshot: sourceIndex.snapshot,
    checks: Object.fromEntries(REQUIRED_CHECKS.map(key => [key, true])), coverage: [],
    files: [...buffers].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha256(bytes) })),
    graph: { snapshot: 'fixture-knowledge', generation: 'fixture-generation' }, codeDigest: sha(JSON.stringify([...buffers].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha256(bytes) })))) };
  return { inspected: { result, captured, anchors, query, buffers }, libs: fakeLibs, graph, graphBytes,
    graphMeta: { nodeCount: graph.nodes.size, edgeCount: 0, canonicalSha256: sha(JSON.stringify(stable(canonical))) },
    authorFiles: [{ absoluteFile, path: 'truth/structure.yaml', buffer: author }], exporterFingerprint: 'b'.repeat(64), verifiedAt: '2026-11-15T00:00:00Z' };
}
function reseal(bundle) {
  bundle.manifest.id = publicSnapshotId(bundle.manifest, bundle.index); bundle.index.snapshot = bundle.manifest.id;
  bundle.manifest.index = descriptor('index.json', jsonBytes(bundle.index)); return bundle;
}

test('source scanning distinguishes type/field numbers from literal credential values', () => {
  for (const source of ['authorization: String)', 'authorization: String, other: Int', 'authorization = authorization, next = value', 'token = parser.nextToken()', 'val secret = underlying.getString("play.http.secret.key").trim', 'val credentials = at < 0 || allowed'])
    assert.equal(sensitiveReason(source, [], { sourcePath: 'Example.scala' }), null, source);
  assert.equal(sensitiveReason('string authorization = 6;', [], { sourcePath: 'example.proto' }), null);
  for (const source of ['val password = "literal"', 'password: String = "literal"', 'secret = Some("literal")', 'password: plaintext', 'authorization = 12345'])
    assert.equal(sensitiveReason(source, [], { sourcePath: 'Example.scala' }), 'secret-value', source);
  assert.equal(sensitiveReason('authorization = 6', [], { sourcePath: 'application.conf' }), 'secret-value');
});

test('repeated author occurrences with one identity remain ambiguous in the bridge', t => {
  const f = fixture(t), index = f.inspected.captured.sourceIndex;
  index.records.push({ ...index.records[1], file: 'another.yaml' });
  const nodes = buildExplorerGraphBridge({ canonical: f.inspected.captured.canonical, graph: f.graph, sourceIndex: index, resolveSourcePointer });
  const command = nodes.find(n => n.id === 'command:Reserve'); assert.equal(command.state, 'ambiguous'); assert.equal(command.identities.length, 1);
});

test('full fixture publishes original files, all 18 locations, N:1 sources and reciprocal graph bridge', t => {
  const f = fixture(t), bundle = buildSnapshot(f), { manifest, index } = bundle;
  assert.deepEqual(manifest.counts, { files: 3, publishedFiles: 2, withheldFiles: 1, identities: 3, locations: 18, spanLocations: 17, mappedNodes: 3 });
  assert.equal(index.nodes.length, 4); assert.equal(index.nodes.find(n => n.id === 'field:unknown').state, 'unmapped');
  const cmd = index.identities.find(i => i.kind === 'command'), guard = index.identities.find(i => i.kind === 'guard');
  assert.deepEqual(cmd.graphNodeIds, ['command:Reserve', 'slice:Reserve']); assert.deepEqual(guard.graphNodeIds, []);
  assert.deepEqual(cmd.sources, guard.sources); assert.equal(cmd.sources[0].pointerLocated, true); assert.equal(cmd.relations[0].identity, guard.id);
  assert.ok(index.files.find(f => f.path === 'build.sbt').reason);
  const code = index.files.find(f => f.path === 'app/Example.scala'); assert.ok(bundle.fileBuffers.get(code.id).equals(f.inspected.buffers.get(code.path)));
  assert.equal(index.locations.filter(l => l.identity === cmd.id).length, 15);
  assert.doesNotMatch(JSON.stringify({ manifest, index }), /repoRoots|absoluteFile|source-verified|file:\/\/\/Users/);
  assert.deepEqual(validateSnapshotBundle(bundle), manifest.counts);
});

test('public acceptance requires both author bytes and code locations after withholding', t => {
  const bundle = buildSnapshot(fixture(t));
  const identity = bundle.index.identities.find(row => row.kind === 'command');
  const query = { select: () => [{ identity: identity.id }] };
  const required = [{ knowledge: identity.id, precision: 'span', minLocations: 1 }];
  assertPublicCoverage(bundle, query, required);
  const author = bundle.index.files.find(file => file.role === 'author');
  author.state = 'withheld';
  assert.throws(() => assertPublicCoverage(bundle, query, required), /author source/);
  author.state = 'published';
  bundle.index.files.find(file => file.path === 'app/Example.scala').state = 'withheld';
  assert.throws(() => assertPublicCoverage(bundle, query, required), /code locations/);
});

test('deterministic noncircular id ignores clock but includes every public association', t => {
  const f = fixture(t), a = buildSnapshot(f), b = buildSnapshot({ ...f, verifiedAt: '2026-11-16T00:00:00Z' });
  assert.equal(a.manifest.id, b.manifest.id); assert.deepEqual(a.index, b.index);
  b.index.locations[0].knowledgeKey += '/different'; assert.notEqual(publicSnapshotId(b.manifest, b.index), a.manifest.id);
});

test('author line hints appear only when the locator actually found the pointer', t => {
  const f = fixture(t); f.libs = { ...f.libs, authorExcerpt: () => ({ pointerLocated: false, startLine: 1, endLine: 2 }) };
  const b = buildSnapshot(f); assert.ok(b.index.identities.every(i => i.sources.every(s => s.startLine === undefined)));
});

for (const [label, change, pattern] of [
  ['failed inspector', f => { f.inspected.result.passed = false; }, /complete inspect/],
  ['missing inspector check', f => { delete f.inspected.result.checks.anchorSpans; }, /complete inspect/],
  ['false future check', f => { f.inspected.result.checks.extraGate = false; }, /complete inspect/],
  ['changed generated hash', f => { f.inspected.result.files[0].sha256 = 'c'.repeat(64); }, /byte\/hash/],
  ['traversal', f => { f.inspected.result.files[0].file = '../private.scala'; }, /raw evidence/],
  ['raw ledger', f => { f.inspected.result.files[0].file = 'truthsrc.ledger.json'; }, /raw evidence/],
  ['uncaptured author', f => { f.authorFiles[0].absoluteFile += '.other'; }, /captured tree/],
  ['changed author', f => { f.authorFiles[0].buffer = Buffer.from('changed'); }, /byte\/hash/],
  ['lost reverse location', f => { const original = f.inspected.query.reverse; f.inspected.query.reverse = file => original(file).slice(1); }, /reverse associations/],
  ['lost forward location', f => { const original = f.inspected.query.forward; f.inspected.query.forward = key => original(key).map(r => ({ ...r, locations: r.locations.slice(1) })); }, /forward location/],
  ['canonical nested secret', f => { f.inspected.captured.canonical.authoring = { deeply: { clientSecret: 'live-value' } }; f.inspected.result.snapshot = f.inspected.captured.sourceIndex.snapshot = sha(JSON.stringify(f.inspected.captured.canonical)); }, /sensitive/],
]) test(`builder rejects ${label}`, t => assert.throws(() => {
  const f = fixture(t); change(f); f.inspected.result.codeDigest = sha(JSON.stringify(f.inspected.result.files)); buildSnapshot(f);
}, pattern));

for (const [label, span] of [
  ['half-character start', { start: 1, end: 4, text: 'β' }], ['half-character end', { start: 0, end: 1, text: 'α' }],
  ['past EOF', { start: 0, end: 999999, text: 'α' }], ['zero width', { start: 0, end: 0, text: '' }],
  ['fractional', { start: 0.1, end: 4, text: 'αβ' }], ['wrong text', { start: 0, end: 4, text: 'XX' }],
]) test(`builder rejects ${label} even with successful fixture inspector`, t => {
  const f = fixture(t), key = Object.keys(f.inspected.anchors.anchors)[1]; f.inspected.anchors.anchors[key][0].span = span;
  assert.throws(() => buildSnapshot(f));
});

test('boundary checker handles Unicode CRLF, overlap, half-open EOF', () => {
  const bytes = Buffer.from('α\r\nβ'); verifySpan(bytes, { start: 0, end: 2, text: 'α' });
  verifySpan(bytes, { start: 2, end: 4, text: '\r\n' }); verifySpan(bytes, { start: 0, end: 6, text: 'α\r\nβ' });
  verifySpan(bytes, { start: 4, end: 6, text: 'β' });
});

for (const [label, change] of [
  ['foreign identity', b => { b.index.locations[0].identity = 'unknown'; }],
  ['foreign file', b => { b.index.locations[0].fileId = 'unknown'; }],
  ['asymmetric graph reference', b => { b.index.identities.find(i => i.kind === 'command').graphNodeIds = []; }],
  ['duplicate identity reference', b => { const n = b.index.nodes.find(n => n.identities.length); n.identities.push(n.identities[0]); }],
  ['withheld resource', b => { b.index.files.find(f => f.state === 'withheld').resource = b.index.files.find(f => f.state === 'published').resource; }],
  ['bad count', b => { b.manifest.counts.locations--; }],
  ['bad public span', b => { b.index.locations.find(l => l.precision === 'span').span.end = 999999; }],
]) test(`public validation rejects ${label} after recomputing its digest`, t => {
  const b = buildSnapshot(fixture(t)); change(b); reseal(b); assert.throws(() => validateSnapshotBundle(b));
});

test('resource, index, graph and snapshot tampering all refuse', t => {
  for (const mutate of [b => { b.graphBytes[0] ^= 1; }, b => { b.index.snapshot = '0'.repeat(64); },
    b => { b.index.locations.pop(); }, b => { [...b.fileBuffers.values()][0][0] ^= 1; }]) {
    const b = buildSnapshot(fixture(t)); mutate(b); assert.throws(() => validateSnapshotBundle(b));
  }
});

test('bridge marks first-wins command/slice collisions ambiguous without guessing aliases', t => {
  const f = fixture(t), c = f.inspected.captured.canonical;
  c.aggregates.push({ name: 'Other', commands: [{ name: 'Reserve' }], events: [] });
  f.inspected.captured.sourceIndex.records.push({ ...f.inspected.captured.sourceIndex.records[1],
    pointer: '/aggregates/1/commands/0', identity: 'knowledge:fixture/context/command/Other/Reserve' });
  const nodes = buildExplorerGraphBridge({ canonical: c, graph: f.graph, sourceIndex: f.inspected.captured.sourceIndex, resolveSourcePointer });
  const n = nodes.find(n => n.id === 'command:Reserve'); assert.equal(n.state, 'ambiguous'); assert.equal(n.identities.length, 2);
  f.graph.nodes.set('command:Alias', { id: 'command:Alias', kind: 'command', name: 'Reserve', atom: { ...c.aggregates[0].commands[0] } });
  assert.equal(buildExplorerGraphBridge({ canonical: c, graph: f.graph, sourceIndex: f.inspected.captured.sourceIndex, resolveSourcePointer })
    .find(n => n.id === 'command:Alias').state, 'unmapped');
});

test('explicit qualifiedRef must match the unique owned definition object', t => {
  const f = fixture(t), c = f.inspected.captured.canonical, id = 'command:Balance.Reserve';
  const node = { id, kind: 'command', name: 'Reserve', atom: c.aggregates[0].commands[0], qualifiedRef: { aggregate: 'Balance', name: 'Reserve' } };
  f.graph.nodes.set(id, node);
  const bridge = () => buildExplorerGraphBridge({ canonical: c, graph: f.graph, sourceIndex: f.inspected.captured.sourceIndex, resolveSourcePointer }).find(n => n.id === id);
  assert.equal(bridge().state, 'mapped'); node.qualifiedRef.aggregate = 'Other'; assert.equal(bridge().state, 'unmapped');
});

for (const value of [
  { deep: [{ authoring: { password: 'actual-password' } }] },
  '-----BEGIN OPENSSH PRIVATE KEY-----', 'file:///Users/alice/build', '/home/alice/.config', 'C:\\Users\\alice\\file',
  'api_key = "live-value"', 'password = hunter2', 'play.http.secret.key = "not-a-public-default"', '/root/.ssh/id_rsa',
  'https://alice:password@example.com', 'javascript:alert(1)',
  '{"nested":{"client\\u0053ecret":"actual"}}',
]) test('safety gate rejects ' + JSON.stringify(value).slice(0, 65), () => assert.ok(sensitiveReason(value)));

test('environment placeholders and inert HTML source are not rewritten', () => {
  assert.equal(sensitiveReason('password = ${?DB_PASSWORD}\napi_key = "${API_KEY}"\n<script>alert(1)</script>'), null);
});

test('filesystem rejects symlinks, traversal, existing and overlapping destinations', t => {
  const root = temp(t), src = join(root, 'src'); mkdirSync(src); writeFileSync(join(src, 'a'), 'a');
  const link = join(root, 'link'); symlinkSync(src, link);
  assert.throws(() => plainPath(join(link, 'a')), /symlink/);
  assert.throws(() => plainPath(root + '/src/../src/a'), /traversal/);
  assert.throws(() => assertDestination(src, []));
  assert.throws(() => assertDestination(join(src, 'new'), [src]), /overlaps/);
  assert.throws(() => assertDestination(join(root, 'link/new'), [src]), /symlink/);
  assertDestination(join(root, 'new'), [src]);
  for (const p of ['../a', '/a', 'a/../b', 'a\\b', 'a%2fb', 'a?b', 'a#b', 'a//b']) assert.equal(safePath(p), false);
});

test('runtimeEvidence marks snapshot compile-and-test-passed and rejects malformed evidence', t => {
  const f = fixture(t);
  const re = { command: 'sbt --batch "Compile/compile" test', compiledSources: 368, suitesPassed: 5, testsPassed: 24, verifiedAt: '2026-11-25T08:00:00Z' };
  const bundle = buildSnapshot({ ...f, runtimeEvidence: re });
  assert.equal(bundle.manifest.evidence.runtime, 'compile-and-test-passed');
  assert.deepEqual(bundle.manifest.evidence.runtimeEvidence, re);
  assert.deepEqual(validateSnapshotBundle(bundle), bundle.manifest.counts);
  const bad = buildSnapshot({ ...f, runtimeEvidence: re });
  delete bad.manifest.evidence.runtimeEvidence;
  reseal(bad);
  assert.throws(() => validateSnapshotBundle(bad), /runtimeEvidence/);
});

test('strict CLI offers no inspected-json or bypass flag', () => {
  assert.throws(() => parseArgs(['--inspected', '/success.json'])); assert.throws(() => parseArgs(['--tool', 'relative']));
  assert.throws(() => parseArgs(['--tool', '/tool', '--tool', '/other']));
  assert.throws(() => parseArgs([]));
});

test('schema is parseable and its relative-path pattern rejects traversal', () => {
  const schema = JSON.parse(readFileSync(join(dir, '../schemas/explorer-snapshot.schema.json')));
  const pattern = new RegExp(schema.$defs.path.pattern);
  assert.ok(pattern.test('files/abc.txt')); assert.ok(!pattern.test('../secret')); assert.ok(!pattern.test('a/../b'));
});

test('matches the real frontend validator and reverse Unicode line semantics', { skip: !consumer && 'set EXPLORER_CONSUMER to the read-only frontend JS' }, t => {
  const b = buildSnapshot(fixture(t)), context = { TextDecoder, URL, crypto: globalThis.crypto };
  runInNewContext(readFileSync(consumer, 'utf8'), context);
  const api = context.ExplorerSnapshot; api.validateManifest(b.manifest, b.manifest.id); api.validateIndex(b.index, b.manifest);
  const file = b.index.files.find(f => f.path === 'app/Example.scala'), ranges = api.lineRanges(b.fileBuffers.get(file.id));
  const first = api.reverse(b.index, file.id, ranges, 1); assert.equal(first.precision, 'span'); assert.equal(first.locations.length, 2);
  const nonSpan = api.reverse(b.index, file.id, ranges, 20); assert.equal(nonSpan.precision, 'file'); assert.equal(nonSpan.locations.length, 18);
});

test('real v2 representation mappings preserve distinct canonical objects sharing one author declaration',
  { skip: !tool && 'set EXPLORER_TOOL for real source-index modules' }, async t => {
    const f = fixture(t), libs = await loadTool(tool), index = f.inspected.captured.sourceIndex;
    index.schemaVersion = 'truthsrc.source-index/v2';
    index.representationMappings = [{ file: 'virtual.yaml', pointer: '/payload', authorFile: 'structure.yaml', authorPointer: '/payload', mode: 'declaration', label: 'structure expansion' }];
    for (const row of index.records) {
      row.virtualFile = 'virtual.yaml'; row.virtualAtomPointer = '/payload' + row.pointer;
      row.locationMapping = { virtualFile: row.virtualFile, virtualPointer: row.virtualAtomPointer, mappingPointer: '/payload',
        authorFile: 'structure.yaml', authorPointer: '/payload', mode: 'declaration', label: 'structure expansion' };
    }
    f.libs = { ...f.libs, validateSourceIndex: libs.validateSourceIndex, resolveSourcePointer: libs.resolveSourcePointer,
      resolveRecordSource: libs.resolveRecordSource, authorExcerpt: libs.authorExcerpt };
    const b = buildSnapshot(f);
    assert.deepEqual(b.index.identities.find(i => i.kind === 'command').sources, b.index.identities.find(i => i.kind === 'guard').sources);
    assert.equal(b.index.locations.length, 18);
  });

test('large source remains whole and no allowlist means no invented author file references', t => {
  const f = fixture(t), path = 'app/Large.scala', bytes = Buffer.from('val message = "unicode αβ"\r\n'.repeat(4000));
  f.inspected.buffers.set(path, bytes); f.inspected.result.files.push({ file: path, bytes: bytes.length, sha256: sha256(bytes) });
  f.inspected.result.codeDigest = sha(JSON.stringify(f.inspected.result.files)); f.authorFiles = [];
  const b = buildSnapshot(f), file = b.index.files.find(row => row.path === path);
  assert.ok(b.fileBuffers.get(file.id).equals(bytes)); assert.ok(b.index.identities.every(row => row.sources.length === 0));
});

test('end-of-export capture drift refuses publication and removes its private staging directory',
  { skip: !tool && 'set EXPLORER_TOOL for the real temporary Counter inspector', timeout: 240000 }, async t => {
    const root = temp(t), projectDir = join(root, 'counter');
    const initialized = JSON.parse(execFileSync(process.execPath, [join(tool, 'bin/truthsrc.js'), 'init', projectDir]));
    const project = initialized.project, out = join(projectDir, 'generated');
    execFileSync(process.execPath, [join(tool, 'bin/truthsrc.js'), 'generate-project', '--project', project, '--out', out], { maxBuffer: 16 * 1024 * 1024 });
    const authors = join(root, 'authors.json'); writeFileSync(authors, '[]');
    // Mutate only this test's Counter as graph construction begins, AFTER the
    // real inspector has passed. The CLI still imports the real verifier; the
    // preload only injects a filesystem race, never an inspected-success DTO.
    const preload = join(root, 'mutate.cjs');
    writeFileSync(preload, `const fs = require('node:fs'); const original = fs.mkdtempSync;
      fs.mkdtempSync = function(prefix, ...args) { if (String(prefix).includes('.explorer-build-')) fs.writeFileSync(${JSON.stringify(authors)}, '[ ]'); return original.call(this, prefix, ...args); };
      require('node:module').syncBuiltinESMExports();`);
    const dest = join(root, 'snapshot');
    const run = spawnSync(process.execPath, ['--require', preload, cli, '--tool', tool, '--project', project, '--out', out,
      '--authors', authors, '--dest', dest], { encoding: 'utf8' });
    assert.notEqual(run.status, 0); assert.match(run.stderr, /whitelist changed/); assert.ok(!existsSync(dest));
    assert.ok(!readdirSync(root).some(name => name.startsWith('.explorer-build-')));
  });

test('real read-only tool: init/generate a temporary Counter, CLI export, hash parity and refusal on drift',
  { skip: !tool && 'set EXPLORER_TOOL to a real read-only tool root', timeout: 240000 }, async t => {
    const root = temp(t), projectDir = join(root, 'counter');
    const initialized = JSON.parse(execFileSync(process.execPath, [join(tool, 'bin/truthsrc.js'), 'init', projectDir], { maxBuffer: 8 * 1024 * 1024 }));
    const project = initialized.project || join(projectDir, 'truthsrc.project.json'), out = join(projectDir, 'generated');
    execFileSync(process.execPath, [join(tool, 'bin/truthsrc.js'), 'generate-project', '--project', project, '--out', out], { maxBuffer: 16 * 1024 * 1024 });
    const libs = await loadTool(tool), inspected = libs.inspectProject({ project, out, required: ['SetCount'] });
    assert.equal(inspected.result.passed, true, JSON.stringify(inspected.result.diagnostics));
    const authorList = inspected.captured.sources.filter(s => s.role === 'tree').map(s => relative(projectDir, s.file));
    const authors = join(root, 'authors.json'), requirements = join(root, 'requirements.json'), dest = join(root, 'snapshot');
    writeFileSync(authors, JSON.stringify(authorList)); writeFileSync(requirements, JSON.stringify({ schemaVersion: 'truthsrc.project-requirements/v1', required: ['SetCount'] }));
    const graphFile = join(projectDir, '.truthsrc/knowledge.sqlite'), before = sha256(readFileSync(graphFile));
    const args = [cli, '--tool', tool, '--project', project, '--out', out, '--authors', authors, '--requirements', requirements, '--dest', dest];
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(run.status, 0, run.stderr); const report = JSON.parse(run.stdout);
    const manifest = JSON.parse(readFileSync(join(dest, 'manifest.json'))), index = JSON.parse(readFileSync(join(dest, 'index.json')));
    assert.equal(report.id, manifest.id); assert.ok(report.counts.spanLocations > 0); assert.equal(before, sha256(readFileSync(graphFile)));
    assert.ok(!existsSync(join(root, 'current.json'))); assert.ok(!existsSync(join(dest, '.truthsrc')));
    const published = index.files.filter(f => f.state === 'published');
    for (const f of published) {
      const original = readFileSync(join(f.role === 'generated' ? out : projectDir, f.path));
      assert.ok(original.equals(readFileSync(join(dest, f.resource.path))));
    }
    if (consumer) { const context = { TextDecoder }; runInNewContext(readFileSync(consumer, 'utf8'), context);
      context.ExplorerSnapshot.validateManifest(manifest); context.ExplorerSnapshot.validateIndex(index, manifest); }
    const denied = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.notEqual(denied.status, 0);
    const victim = join(out, inspected.result.files.find(f => f.file.endsWith('.scala')).file);
    writeFileSync(victim, readFileSync(victim, 'utf8') + '\n// changed fixture\n');
    const failedDest = join(root, 'drift-refused'); args[args.length - 1] = failedDest;
    const failed = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.notEqual(failed.status, 0); assert.match(failed.stderr, /inspectProject refused/); assert.ok(!existsSync(failedDest));
    t.diagnostic('temporary Counter export counts: ' + JSON.stringify(report.counts));
  });
