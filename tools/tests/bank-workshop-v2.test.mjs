import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const htmlPath = new URL('../../downloads/bank-workshop-v2.html', import.meta.url);

test('v2 bank workshop offline snapshot is self-contained, CSP-valid, sanitized, and zero-omission', () => {
  const html = readFileSync(htmlPath, 'utf8');
  assert.doesNotMatch(html, /\/Users\//, 'must not leak local machine paths');
  assert.match(html, /default-src (?:&#39;|')none(?:&#39;|')/);

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const dataMatch = html.match(/<script id="workshop-view" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch && styleMatch && dataMatch, 'must embed style, script, and workshop-view JSON');

  const scriptHash = createHash('sha256').update(scriptMatch[1]).digest('base64');
  const styleHash = createHash('sha256').update(styleMatch[1]).digest('base64');
  assert.ok(html.includes(`sha256-${scriptHash}`), 'CSP must match inline script sha256');
  assert.ok(html.includes(`sha256-${styleHash}`), 'CSP must match inline style sha256');

  const view = JSON.parse(dataMatch[1]);
  assert.equal(view.schemaVersion, 'truthsrc.project-view/v1');
  assert.equal(view.nodes.length, 58);
  assert.equal(view.edges.length, 47);
  assert.equal(view.totals.omittedNodes, 0);
  assert.equal(view.chapters.length, 5);
  assert.equal(view.verification.passed, true);

  for (const node of view.nodes) {
    assert.ok(node.sources.length > 0, `node ${node.id} must have at least one author source`);
    assert.ok(node.locations.length > 0, `node ${node.id} must have at least one code/spec location`);
    assert.equal(node.state, 'mapped', `node ${node.id} must be mapped`);
    for (const s of node.sources) assert.ok(s.file.startsWith('v2-pilot/'), `source path must be relative to v2-pilot: ${s.file}`);
    for (const l of node.locations) assert.ok(l.file.startsWith('v2-pilot/'), `code path must be relative to v2-pilot: ${l.file}`);
  }
});
