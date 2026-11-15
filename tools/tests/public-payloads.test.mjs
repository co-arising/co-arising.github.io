import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
const checker = new URL('../check-public-payloads.py', import.meta.url).pathname;
const run = root => {
  const result = spawnSync('python3', ['-B', checker, '--root', root], { encoding: 'utf8' });
  return { status: result.status, ...JSON.parse(result.stdout) };
};
test('empty or wrong-root scans fail rather than claiming a clean release', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-empty-'));
  try { assert.equal(run(root).status, 1); assert.match(run(root).errors[0], /No public payloads/); }
  finally { rmSync(root, { recursive: true, force: true }); }
});

test('public payload scan includes legacy download HTML and does not echo private values', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-payload-'));
  try {
    mkdirSync(join(root, 'downloads'));
    writeFileSync(join(root, 'downloads', 'history.html'), '<script type="application/json">{"output":"/Users/private-name/project"}</script>');
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.errors[0], /downloads\/history.html/);
    assert.doesNotMatch(JSON.stringify(result), /private-name/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('raw SQLite content is scanned, even when UI never renders the field', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-sqlite-'));
  try {
    mkdirSync(join(root, 'assets/data'), { recursive: true });
    const file = join(root, 'assets/data/graph.sqlite');
    execFileSync('python3', ['-c', 'import sqlite3,sys; d=sqlite3.connect(sys.argv[1]); d.execute("create table meta(k text,v text)"); d.execute("create table nodes(id text)"); d.execute("create table edges(id text)"); d.execute("insert into meta values (?,?)",("capture","/Users/private-name/project")); d.commit(); d.close()', file]);
    const result = run(root);
    assert.equal(result.status, 1); assert.match(result.errors[0], /graph.sqlite:meta/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('unpublished pointer is not a release error, but escaping manifests and symlinks are', () => {
  const root = mkdtempSync(join(tmpdir(), 'public-pointer-'));
  try {
    const base = join(root, 'assets/data/explorer'); mkdirSync(base, { recursive: true });
    const file = join(base, 'current.json');
    writeFileSync(file, JSON.stringify({ schemaVersion: 'co-arising.explorer-current/v1', state: 'unavailable' }));
    assert.equal(run(root).status, 0);
    writeFileSync(file, JSON.stringify({ schemaVersion: 'co-arising.explorer-current/v1', state: 'available', manifest: { path: '../private' } }));
    assert.match(run(root).errors[0], /invalid resource path/);
    rmSync(file); symlinkSync('/does-not-exist', file);
    assert.match(run(root).errors[0], /symlink/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
