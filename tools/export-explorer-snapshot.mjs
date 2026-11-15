#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildExplorerGraphBridge } from './explorer-graph-bridge.mjs';
import { SCHEMA, INDEX_SCHEMA, assertInspected, descriptor, publicSnapshotId, validateSnapshotBundle } from './explorer-snapshot-contract.mjs';
import { HASH, assertDestination, assertPublic, contains, jsonBytes, plainPath, readPlain, repoRoot,
  safePath, sha256, sensitiveReason, stable, text, verifyBuffer, verifySpan } from './explorer-snapshot-security.mjs';

const ownDir = dirname(fileURLToPath(import.meta.url));
const sortById = rows => rows.sort((a, b) => a.id.localeCompare(b.id));
const keyOf = value => JSON.stringify(value);
const originKey = row => keyOf([row.identity, row.file, row.atomPointer, row.pointer, row.kind, row.relation]);
const locationKey = row => keyOf([row.file, row.span?.start ?? null, row.span?.end ?? null, row.span?.text ?? null]);
const sameMultiset = (a, b, key, message) => assert.deepEqual(a.map(key).sort(), b.map(key).sort(), message);

export async function loadTool(tool) {
  plainPath(tool, { directory: true });
  const files = ['lib/project/verify.mjs', 'lib/query.mjs', 'lib/graphstore.mjs', 'lib/source-index.mjs',
    'lib/project/view-source.mjs', 'lib/project/view-relations.mjs', 'lib/project/cli.mjs'];
  const modules = await Promise.all(files.map(file => {
    const full = join(tool, file); plainPath(full); return import(pathToFileURL(full).href);
  }));
  return Object.assign({}, ...modules);
}

/** Pure publication builder. Fixtures can inject libraries and inspected
 * internals; the public CLI NEVER reads an inspected-success JSON or accepts a
 * verifier override. It always calls the selected tool's complete inspector.
 * authorFiles are explicitly allowlisted, already captured original buffers.
 */
export function buildSnapshot({ inspected, libs, graph, graphBytes, graphMeta, authorFiles = [],
  exporterFingerprint, verifiedAt = new Date().toISOString(), privateRoots = [] }) {
  assertInspected(inspected);
  const { result, captured, anchors, query, buffers } = inspected;
  libs.validateSourceIndex(captured.sourceIndex);
  assert.equal(result.snapshot, captured.sourceIndex.snapshot, 'source snapshot differs');
  assert.equal(captured.sourceIndex.snapshot, 'sha256:' + sha256(Buffer.from(JSON.stringify(captured.canonical))), 'canonical/source snapshot mismatch');
  assertPublic(captured.canonical, privateRoots); // including nested authoring; never redact canonical
  assertPublic({ nodes: [...graph.nodes.values()], edges: graph.edges, diagnostics: graph.diagnostics || [] }, privateRoots);
  assertPublic(Buffer.from(graphBytes).toString('utf8'), privateRoots);
  assert.equal(graphMeta.nodeCount, graph.nodes.size); assert.equal(graphMeta.edgeCount, graph.edges.length);
  assert.equal(graphMeta.canonicalSha256, 'sha256:' + sha256(Buffer.from(JSON.stringify(stable(captured.canonical)))), 'graph canonical digest differs');
  assert.equal(result.codeDigest, 'sha256:' + sha256(Buffer.from(JSON.stringify(result.files))), 'inspector code digest differs');
  assert.ok(HASH.test(exporterFingerprint), 'exporter own-files fingerprint required');
  const tools = captured.sources.filter(s => s.role === 'tool');
  assert.ok(tools.length === 1 && HASH.test(tools[0].sha256), 'captured tool fingerprint required');
  const files = [], fileBuffers = new Map(), generated = new Map(), authors = new Map();
  const fileRow = (path, role, bytes, evidence) => {
    assert.ok(safePath(path), 'unsafe public file path'); verifyBuffer(bytes, evidence);
    const id = 'file:' + sha256(Buffer.from(role + ':' + path)), reason = sensitiveReason(text(bytes), privateRoots, { sourcePath: path });
    const row = { id, path, role, sha256: evidence.sha256, bytes: bytes.length,
      state: reason ? 'withheld' : 'published', ...(reason ? { reason } : { resource: descriptor(`files/${evidence.sha256}.txt`, bytes) }) };
    assert.ok(!fileBuffers.has(id), 'duplicate publication file');
    files.push(row); fileBuffers.set(id, Buffer.from(bytes)); return row;
  };
  assert.ok(Array.isArray(result.files), 'generated membership required');
  for (const f of result.files) {
    assert.ok(safePath(f.file) && !f.file.startsWith('.truthsrc/') && !['anchors.json', 'truthsrc.ledger.json'].includes(f.file), 'raw evidence is not publishable');
    const row = fileRow(f.file, 'generated', buffers.get(f.file), f); generated.set(f.file, row);
  }
  assert.equal(generated.size, result.files.length, 'duplicate generated membership');
  for (const author of authorFiles) {
    const source = captured.sources.find(s => s.file === author.absoluteFile && (s.role === 'tree' || s.document));
    assert.ok(source, 'author is not a captured tree/document file');
    verifyBuffer(author.buffer, source);
    assert.ok(!authors.has(author.absoluteFile), 'duplicate author whitelist');
    authors.set(author.absoluteFile, fileRow(author.path, 'author', author.buffer, source));
  }
  const identities = new Map();
  const addOrigin = row => {
    assert.ok(typeof row.identity === 'string' && row.identity && typeof row.kind === 'string' && row.kind, 'invalid source identity');
    let identity = identities.get(row.identity);
    if (!identity) {
      identity = { id: row.identity, name: row.name == null ? row.identity : String(row.name), kind: row.kind,
        graphNodeIds: [], sources: [] };
      identities.set(row.identity, identity);
    }
    assert.equal(identity.kind, row.kind, 'identity kind collision');
    if (row.relation === 'unresolved' || !row.file || row.atomPointer == null) return;
    assert.ok(row.kind === 'technical-binding' ? isAbsolute(row.file) : safePath(row.file), 'unsafe source origin');
    const absolute = row.kind === 'technical-binding' ? row.file : join(captured.tree, row.file);
    const source = authors.get(absolute);
    if (!source) return; // not whitelisted: no fictional file or source pointer
    const location = { fileId: source.id, pointer: row.atomPointer };
    const excerpt = libs.authorExcerpt(text(fileBuffers.get(source.id)), row.atomPointer);
    if (excerpt.pointerLocated) { location.pointerLocated = true; location.startLine = excerpt.startLine; location.endLine = excerpt.endLine; }
    if (!identity.sources.some(s => keyOf(s) === keyOf(location))) identity.sources.push(location);
  };
  for (const record of captured.sourceIndex.records) addOrigin(libs.resolveRecordSource(captured.sourceIndex, record));
  const locations = [], reverseExpected = new Map();
  // Keep one public row for each exact anchor occurrence × qualified identity.
  // Do not slice locations or collapse multiple byte spans in the same file.
  for (const knowledgeKey of Object.keys(anchors.anchors).sort()) {
    const original = anchors.anchors[knowledgeKey], origins = query.origins(knowledgeKey), forward = query.forward(knowledgeKey);
    assert.ok(forward.length === 1 && forward[0].knowledge === knowledgeKey, 'forward key mismatch');
    sameMultiset(forward[0].origins, origins, originKey, 'forward origins mismatch');
    sameMultiset(forward[0].locations, original, locationKey, 'forward location mismatch');
    const prefix = `source:${captured.config.canonicalId}#`;
    if (knowledgeKey.startsWith(prefix)) sameMultiset(libs.resolveSourcePointer(captured.sourceIndex, knowledgeKey.slice(prefix.length)), origins,
      originKey, 'canonical pointer origins mismatch');
    assert.ok(origins.length && origins.every(row => row.relation !== 'unresolved' && row.file), 'unresolved anchor origins');
    origins.forEach(addOrigin);
    const ids = [...new Set(origins.map(row => row.identity))].sort();
    for (const [ordinal, loc] of original.entries()) {
      assert.ok(safePath(loc.file) && buffers.has(loc.file), 'anchor references foreign file');
      const buffer = buffers.get(loc.file);
      assert.ok(loc.status === 'source-verified' && loc.fingerprint === 'sha256:' + sha256(buffer) &&
        loc.verification?.fileVerified === true, 'unverified anchor bytes');
      if (loc.span) {
        assert.equal(loc.verification.spanVerified, true, 'unverified span');
        assert.equal(typeof loc.span.text, 'string', 'exact span text required'); verifySpan(buffer, loc.span);
      }
      if (!reverseExpected.has(loc.file)) reverseExpected.set(loc.file, []);
      reverseExpected.get(loc.file).push({ knowledge: knowledgeKey, origins, location: loc });
      const file = generated.get(loc.file);
      // Inspector also authenticates internal project evidence. Its locations
      // remain accounted for in query parity, but those files are never public.
      if (!file) {
        assert.ok(loc.file.startsWith('.truthsrc/') && inspected.plan?.entries.some(entry => entry.path === loc.file && entry.kind === 'project-evidence'),
          'non-public anchor is not verified internal project evidence');
        continue;
      }
      for (const identity of ids) locations.push({
        id: 'location:' + sha256(Buffer.from(keyOf([knowledgeKey, ordinal, identity, file.id, loc.span?.start, loc.span?.end]))),
        identity, fileId: file.id, precision: loc.span ? 'span' : 'file', knowledgeKey,
        ...(loc.span ? { span: { start: loc.span.start, end: loc.span.end } } : {}) });
    }
  }
  const reverseKey = row => keyOf([row.knowledge, locationKey(row.location), row.origins.map(originKey).sort()]);
  for (const file of new Set([...generated.keys(), ...reverseExpected.keys()]))
    sameMultiset(query.reverse(file), reverseExpected.get(file) || [], reverseKey, 'reverse associations mismatch');
  const nodes = buildExplorerGraphBridge({ canonical: captured.canonical, graph, sourceIndex: captured.sourceIndex,
    resolveSourcePointer: libs.resolveSourcePointer });
  for (const node of nodes) for (const id of node.identities) {
    assert.ok(identities.has(id), 'bridge identity absent from source index'); identities.get(id).graphNodeIds.push(node.id);
  }
  const declared = libs.declaredViewRelations(captured.canonical, captured.sourceIndex);
  for (const edge of declared.edges) {
    assert.ok(identities.has(edge.from) && identities.has(edge.to), 'declared relation has foreign identity');
    const row = identities.get(edge.from), relation = { identity: edge.to, carrier: edge.proof.carrier };
    row.relations ||= [];
    if (!row.relations.some(r => keyOf(r) === keyOf(relation))) row.relations.push(relation);
  }
  for (const identity of identities.values()) {
    identity.graphNodeIds.sort(); identity.sources.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
    identity.relations?.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  }
  const index = { schemaVersion: INDEX_SCHEMA, snapshot: '', nodes, files: sortById(files),
    identities: sortById([...identities.values()]), locations: sortById(locations) };
  const manifest = { schemaVersion: SCHEMA, id: '', project: { name: String(captured.canonical.workshop || captured.config.context) }, verifiedAt,
    evidence: { state: 'verified-at-export', runtime: 'not-run', sourceSnapshot: result.snapshot,
      knowledgeSnapshot: result.graph.snapshot, generation: result.graph.generation, codeDigest: result.codeDigest,
      toolFingerprint: tools[0].sha256, exporterFingerprint },
    graph: { ...descriptor('graph.sqlite', graphBytes), nodeCount: graph.nodes.size, edgeCount: graph.edges.length,
      canonicalDigest: graphMeta.canonicalSha256 },
    index: {}, counts: { files: files.length, publishedFiles: files.filter(f => f.state === 'published').length,
      withheldFiles: files.filter(f => f.state === 'withheld').length, identities: identities.size, locations: locations.length,
      spanLocations: locations.filter(l => l.precision === 'span').length, mappedNodes: nodes.filter(n => n.identities.length).length } };
  manifest.id = publicSnapshotId(manifest, index); index.snapshot = manifest.id;
  manifest.index = descriptor('index.json', jsonBytes(index));
  const bundle = { manifest, index, graphBytes: Buffer.from(graphBytes), fileBuffers };
  validateSnapshotBundle(bundle, privateRoots);
  return bundle;
}

export function exporterFiles() {
  return ['export-explorer-snapshot.mjs', ...readdirSync(ownDir).filter(name => /^explorer-.*\.(?:mjs|md|txt)$/.test(name)),
    'schemas/explorer-snapshot.schema.json', 'tests/explorer-snapshot.test.mjs'].sort();
}
function fingerprintExporter() {
  const rows = exporterFiles().map(name => [name, sha256(readPlain(join(ownDir, name)))]);
  return sha256(jsonBytes(rows));
}
function bankRoots(tool) {
  return readdirSync(dirname(tool), { withFileTypes: true }).filter(row => row.isDirectory() && /^bank(?:[-_]|ing)/i.test(row.name))
    .map(row => join(dirname(tool), row.name));
}
export function parseArgs(args) {
  const flags = new Map(), required = ['tool', 'project', 'out', 'dest', 'authors'];
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]?.slice(2), value = args[i + 1];
    assert.ok(args[i]?.startsWith('--') && [...required, 'requirements'].includes(name) && !flags.has(name) && value && !value.startsWith('--'),
      'accepts unique --tool --project --out --dest --authors [--requirements] only');
    assert.ok(isAbsolute(value), 'every CLI path must be absolute'); flags.set(name, value);
  }
  assert.ok(required.every(key => flags.has(key)), 'explicit tool/project/out/dest/authors required');
  return Object.fromEntries(flags);
}
export function assertPublicCoverage(bundle, query, required) {
  const files = new Map(bundle.index.files.map(file => [file.id, file]));
  for (const request of required) {
    const requirement = typeof request === 'string' ? { knowledge: request, precision: 'span', minLocations: 1 } : { precision: 'span', minLocations: 1, ...request };
    const ids = [...new Set(query.select(requirement.knowledge).map(row => row.identity))];
    assert.equal(ids.length, 1, 'required public identity must be unambiguous');
    const identity = bundle.index.identities.find(row => row.id === ids[0]);
    assert.ok(identity?.sources.some(source => files.get(source.fileId)?.state === 'published'), 'required author source is not publicly available');
    const matches = bundle.index.locations.filter(location => location.identity === ids[0] && files.get(location.fileId)?.state === 'published' &&
      (requirement.precision !== 'span' || location.precision === 'span'));
    const unique = new Set(matches.map(location => JSON.stringify([location.fileId, location.span ?? null])));
    assert.ok(unique.size >= (requirement.minLocations ?? 1), 'required code locations were withheld or are below public precision');
  }
}

export async function exportSnapshot(options) {
  const { tool, project, out, dest, authors, requirements } = options;
  plainPath(tool, { directory: true }); plainPath(project); plainPath(out, { directory: true }); plainPath(authors);
  if (requirements) plainPath(requirements);
  const root = repoRoot(project), forbidden = [root, tool, out, ...bankRoots(tool)];
  assertDestination(dest, forbidden);
  const authorsBytes = readPlain(authors), whitelist = JSON.parse(text(authorsBytes));
  assert.ok(Array.isArray(whitelist) && whitelist.every(safePath) && new Set(whitelist).size === whitelist.length, 'authors must be unique real repo-relative paths');
  const requirementsBytes = requirements ? readPlain(requirements) : undefined;
  const coverage = requirements ? JSON.parse(text(requirementsBytes)) : { schemaVersion: 'truthsrc.project-requirements/v1', required: [] };
  assert.equal(coverage.schemaVersion, 'truthsrc.project-requirements/v1');
  assert.deepEqual(Object.keys(coverage).sort(), ['required', 'schemaVersion']);
  const outputMembership = (directory = out, prefix = '') => readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = prefix + entry.name, full = join(directory, entry.name);
    assert.ok(safePath(file) && !entry.isSymbolicLink(), 'unsafe output membership');
    if (entry.isDirectory()) return ['target', 'project/target', 'project/project/target'].includes(file) ? [] : outputMembership(full, file + '/');
    const stat = lstatSync(full); assert.ok(stat.isFile() && stat.nlink === 1, 'non-plain output member');
    return [file];
  });
  const membership = outputMembership();
  const receipts = new Map(['anchors.json', 'truthsrc.ledger.json'].map(file => [file, readPlain(join(out, file))]));
  const fingerprint = fingerprintExporter(), libs = await loadTool(tool);
  const inspected = await libs.inspectProject({ project, out, required: coverage.required });
  // Never publish raw diagnostics containing workstation paths or secret data.
  if (!inspected.result?.passed) {
    const failed = Object.entries(inspected.result?.checks || {}).filter(([, passed]) => passed !== true).map(([name]) => name);
    throw new Error('inspectProject refused export; failed checks: ' + failed.join(', '));
  }
  assertInspected(inspected);
  const { captured } = inspected;
  assert.equal(resolve(inspected.result.project), project); assert.equal(resolve(inspected.result.output), out);
  assert.equal(resolve(captured.sources.find(s => s.role === 'tool')?.root || ''), tool, 'inspector tool does not match explicit tool');
  for (const source of captured.sources) {
    if (source.file) { plainPath(source.file); forbidden.push(source.file); }
    if (source.root) forbidden.push(resolve(source.root));
  }
  forbidden.push(captured.tree);
  assertDestination(dest, forbidden);
  const authorFiles = whitelist.map(path => {
    const absoluteFile = join(root, path); assert.ok(contains(root, absoluteFile));
    return { path, absoluteFile, buffer: readPlain(absoluteFile) };
  });
  const closed = () => {
    libs.assertUnchanged(captured);
    assert.deepEqual(outputMembership(), membership, 'output membership changed during export');
    for (const [file, bytes] of receipts) assert.ok(readPlain(join(out, file)).equals(bytes), 'generation receipt changed during export');
    for (const [file, buffer] of inspected.buffers) {
      assert.ok(safePath(file), 'unsafe captured output');
      assert.ok(readPlain(join(out, file)).equals(buffer), 'generated/evidence capture changed during export');
    }
    for (const author of authorFiles) assert.ok(readPlain(author.absoluteFile).equals(author.buffer), 'author capture changed during export');
    assert.ok(readPlain(authors).equals(authorsBytes), 'author whitelist changed during export');
    if (requirements) assert.ok(readPlain(requirements).equals(requirementsBytes), 'requirements changed during export');
    assert.equal(fingerprintExporter(), fingerprint, 'exporter changed during export');
  };
  assertPublic(captured.canonical, forbidden);
  const graph = libs.buildGraph(captured.canonical);
  assertPublic({ nodes: [...graph.nodes.values()], edges: graph.edges, diagnostics: graph.diagnostics }, forbidden);
  const scratch = mkdtempSync(join(dirname(dest), '.explorer-build-'));
  let created = false;
  try {
    const graphFile = join(scratch, 'graph.sqlite');
    const graphMeta = libs.buildGraphStore(captured.canonical, { file: graphFile });
    const bundle = buildSnapshot({ inspected, libs, graph, graphBytes: readPlain(graphFile), graphMeta, authorFiles,
      exporterFingerprint: fingerprint, privateRoots: forbidden });
    assertPublicCoverage(bundle, inspected.query, coverage.required);
    closed(); assertDestination(dest, forbidden);
    // mkdir is exclusive; unlike rename-to-directory this cannot overwrite an
    // empty directory another process created after the absence check.
    mkdirSync(dest); created = true; mkdirSync(join(dest, 'files'));
    const write = (name, bytes) => { assert.ok(safePath(name)); writeFileSync(join(dest, name), bytes, { flag: 'wx', mode: 0o644 }); };
    write('graph.sqlite', bundle.graphBytes); write('index.json', jsonBytes(bundle.index));
    const resources = new Set();
    for (const file of bundle.index.files) if (file.state === 'published' && !resources.has(file.resource.path)) {
      write(file.resource.path, bundle.fileBuffers.get(file.id)); resources.add(file.resource.path);
    }
    // The manifest is the final commit marker. No current.json is ever touched.
    closed();
    const manifestBytes = jsonBytes(bundle.manifest);
    write('manifest.json', manifestBytes);
    return { id: bundle.manifest.id, destination: dest, counts: bundle.manifest.counts, runtime: 'not-run',
      manifest: descriptor(`snapshots/${bundle.manifest.id}/manifest.json`, manifestBytes) };
  } catch (error) {
    if (created) rmSync(dest, { recursive: true, force: true });
    throw error;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await exportSnapshot(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error('Explorer export refused: ' + (error.code === 'ERR_ASSERTION' ? error.message.split('\n')[0] : error.message)); process.exitCode = 1; }
}
