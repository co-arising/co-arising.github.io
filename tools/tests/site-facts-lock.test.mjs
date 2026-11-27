import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('assets/data/facts.lock.json is sanitized, matches current explorer pointer, and passes sync-site-facts --check', () => {
  const lockRaw = readFileSync(join(ROOT, 'assets/data/facts.lock.json'), 'utf8');
  assert.doesNotMatch(lockRaw, /\/Users\/|\/home\//u, 'facts.lock.json must not contain local machine paths');

  const lock = JSON.parse(lockRaw);
  const current = JSON.parse(readFileSync(join(ROOT, 'assets/data/explorer/current.json'), 'utf8'));

  assert.equal(lock.schemaVersion, 'co-arising.site-facts-lock/v1');
  assert.equal(lock.cohort.explorerSnapshot, current.snapshot);
  assert.ok(Array.isArray(lock.capabilities.cliCommands) && lock.capabilities.cliCommands.length >= 30);
  assert.equal(lock.capabilities.mcpTotal, 32);
  assert.equal(lock.pilot.governedFiles, 188);
  assert.equal(lock.pilot.coverageRatio, 1);

  const stdout = execFileSync(process.execPath, [join(ROOT, 'tools/sync-site-facts.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const report = JSON.parse(stdout);
  assert.deepEqual(report.errors, []);
});
