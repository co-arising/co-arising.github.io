import assert from 'node:assert/strict';
import { HASH, MAX_BYTES, assertPublic, jsonBytes, pointer, safePath, sha256, verifyBuffer, verifySpan, text } from './explorer-snapshot-security.mjs';

export const SCHEMA = 'co-arising.explorer-snapshot/v1';
export const INDEX_SCHEMA = 'co-arising.explorer-index/v1';
export const REQUIRED_CHECKS = ['currentInputs', 'graphSnapshot', 'graphAst', 'plannedFiles', 'finalBytes', 'ownership',
  'anchorMembership', 'anchorSpans', 'sameGraphAnchors', 'sourceAssociations', 'requiredCoverage', 'captureUnchanged'];
const string = x => typeof x === 'string' && x.length > 0 && x.length <= 8192;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const array = (x, max) => { assert.ok(Array.isArray(x) && x.length <= max, 'array limit/schema mismatch'); return x; };
export const descriptor = (path, bytes) => ({ path, bytes: bytes.length, sha256: sha256(bytes) });
export function assertInspected(inspected) {
  const r = inspected?.result;
  assert.ok(r?.passed === true && r.schemaVersion === 'truthsrc.project-verification/v1' &&
    REQUIRED_CHECKS.every(name => r.checks?.[name] === true) && Object.values(r.checks).every(value => value === true) &&
    Array.isArray(r.coverage) && r.coverage.every(row => row.passed === true), 'complete inspectProject verification required');
  assert.ok(inspected.captured && inspected.query && inspected.buffers instanceof Map && inspected.anchors, 'same-capture internals required');
}
// Noncircular identity: omit ONLY manifest id/index descriptor/date and index
// snapshot. All file descriptors, graph bytes, source evidence and public DTO
// fields participate. A date change alone is not a different material snapshot.
export function publicSnapshotId(manifest, index) {
  const { id, index: indexDescriptor, verifiedAt, ...evidenceAndPayload } = manifest;
  const { snapshot, ...publicIndex } = index;
  return sha256(jsonBytes({ manifest: evidenceAndPayload, index: publicIndex }));
}

/** Full public contract + cross-reference + byte validation, used by fixtures
 * and CLI alike. resources contains bytes of EVERY file, even withheld ones;
 * output writes only published resources. Nothing is repaired during checking.
 */
export function validateSnapshotBundle({ manifest: m, index, graphBytes, fileBuffers }, roots = []) {
  assert.ok(m.schemaVersion === SCHEMA && HASH.test(m.id), 'manifest schema/id');
  assert.ok(string(m.project?.name) && Number.isFinite(Date.parse(m.verifiedAt)), 'manifest project/date');
  assert.ok(m.evidence?.state === 'verified-at-export' && ['not-run', 'compile-and-test-passed'].includes(m.evidence.runtime), 'verification scope');
  if (m.evidence.runtime === 'compile-and-test-passed') {
    const re = m.evidence.runtimeEvidence;
    assert.ok(re && typeof re === 'object' && !Array.isArray(re), 'missing runtimeEvidence');
    assert.ok(string(re.command) && integer(re.compiledSources) && integer(re.suitesPassed) &&
      integer(re.testsPassed) && Number.isFinite(Date.parse(re.verifiedAt)), 'invalid runtimeEvidence');
  } else {
    assert.equal(m.evidence.runtimeEvidence, undefined, 'unexpected runtimeEvidence for not-run');
  }
  for (const key of ['sourceSnapshot', 'knowledgeSnapshot', 'generation', 'codeDigest', 'toolFingerprint', 'exporterFingerprint'])
    assert.ok(string(m.evidence[key]), 'missing evidence');
  assert.ok(jsonBytes(m).length <= MAX_BYTES, 'manifest exceeds resource limit');
  assertPublic(Buffer.from(graphBytes).toString('utf8'), roots);
  assert.ok(index.schemaVersion === INDEX_SCHEMA && index.snapshot === m.id, 'index snapshot/schema');
  const checkDescriptor = d => assert.ok(d && safePath(d.path) && HASH.test(d.sha256) && integer(d.bytes) && d.bytes <= MAX_BYTES, 'invalid resource descriptor');
  checkDescriptor(m.graph); checkDescriptor(m.index);
  assert.equal(m.graph.path, 'graph.sqlite'); assert.equal(m.index.path, 'index.json');
  assert.ok(integer(m.graph.nodeCount) && integer(m.graph.edgeCount) && string(m.graph.canonicalDigest), 'graph summary');
  assert.equal(graphBytes.length, m.graph.bytes); assert.equal(sha256(graphBytes), m.graph.sha256, 'graph byte/hash mismatch');
  assert.ok(Buffer.from(graphBytes).subarray(0, 16).equals(Buffer.from('SQLite format 3\0')), 'not a SQLite graph');
  assert.equal(jsonBytes(index).length, m.index.bytes); assert.equal(sha256(jsonBytes(index)), m.index.sha256, 'index byte/hash mismatch');
  assert.equal(publicSnapshotId(m, index), m.id, 'public snapshot digest mismatch');
  const map = (rows, max) => {
    const result = new Map();
    for (const row of array(rows, max)) { assert.ok(row && string(row.id) && !result.has(row.id), 'duplicate/invalid row id'); result.set(row.id, row); }
    return result;
  };
  const files = map(index.files, 100000), nodes = map(index.nodes, 100000), identities = map(index.identities, 100000), locations = map(index.locations, 1000000);
  const refs = (rows, target) => { array(rows, 100000); assert.ok(new Set(rows).size === rows.length && rows.every(id => target.has(id)), 'dangling/duplicate reference'); };
  const paths = new Set();
  for (const f of files.values()) {
    assert.ok(safePath(f.path) && ['generated', 'author'].includes(f.role), 'invalid file path/role');
    const key = f.role + ':' + f.path; assert.ok(!paths.has(key), 'duplicate file path'); paths.add(key);
    const bytes = fileBuffers.get(f.id); verifyBuffer(bytes, f);
    assert.ok(['published', 'withheld'].includes(f.state), 'publication state');
    if (f.state === 'published') {
      checkDescriptor(f.resource);
      assert.deepEqual(f.resource, { path: `files/${f.sha256}.txt`, sha256: f.sha256, bytes: f.bytes }, 'file resource mismatch');
      assertPublic(text(bytes), roots, { sourcePath: f.path });
    } else assert.ok(string(f.reason) && f.resource === undefined, 'withheld file has resource/no reason');
  }
  assert.equal(fileBuffers.size, files.size, 'foreign/missing source buffer');
  for (const node of nodes.values()) {
    assert.ok(['mapped', 'unmapped', 'ambiguous'].includes(node.state), 'bridge state');
    refs(node.identities, identities); array(node.pointers, 100000);
    assert.ok(node.pointers.every(pointer), 'canonical pointers');
    assert.ok(node.state !== 'unmapped' || !node.identities.length, 'unmapped node with identity');
    assert.ok(node.state !== 'mapped' || node.identities.length === 1, 'mapped node must be unambiguous');
    for (const id of node.identities) assert.ok(identities.get(id).graphNodeIds.includes(node.id), 'asymmetric node bridge');
  }
  for (const identity of identities.values()) {
    assert.ok(string(identity.name) && string(identity.kind), 'identity name/kind');
    refs(identity.graphNodeIds, nodes);
    for (const id of identity.graphNodeIds) assert.ok(nodes.get(id).identities.includes(identity.id), 'asymmetric identity bridge');
    for (const source of array(identity.sources, 100000)) {
      const file = files.get(source.fileId);
      assert.ok(file?.role === 'author' && pointer(source.pointer), 'invalid author source');
      if (source.startLine !== undefined || source.endLine !== undefined) {
        assert.equal(source.pointerLocated, true, 'line hints require a located author pointer');
        const lineCount = text(fileBuffers.get(source.fileId)).split('\n').length;
        assert.ok(Number.isSafeInteger(source.startLine) && source.startLine > 0 && Number.isSafeInteger(source.endLine) &&
          source.endLine >= source.startLine && source.endLine <= lineCount, 'invalid author line hint');
      }
    }
    for (const rel of array(identity.relations || [], 100000)) assert.ok(identities.has(rel.identity) && string(rel.carrier), 'invalid declared relation');
  }
  for (const loc of locations.values()) {
    assert.ok(identities.has(loc.identity) && files.get(loc.fileId)?.role === 'generated' && string(loc.knowledgeKey), 'invalid location reference');
    assert.ok(['span', 'file'].includes(loc.precision), 'invalid precision');
    if (loc.precision === 'span') verifySpan(fileBuffers.get(loc.fileId), loc.span);
    else assert.equal(loc.span, undefined, 'file candidate has a span');
  }
  const counts = { files: files.size, publishedFiles: index.files.filter(f => f.state === 'published').length,
    withheldFiles: index.files.filter(f => f.state === 'withheld').length, identities: identities.size, locations: locations.size,
    spanLocations: index.locations.filter(l => l.precision === 'span').length, mappedNodes: index.nodes.filter(n => n.identities.length).length };
  for (const [key, value] of Object.entries(counts)) assert.equal(m.counts[key], value, 'count mismatch: ' + key);
  assert.equal(nodes.size, m.graph.nodeCount, 'graph node count mismatch');
  assertPublic(m, roots); assertPublic(index, roots);
  return counts;
}
