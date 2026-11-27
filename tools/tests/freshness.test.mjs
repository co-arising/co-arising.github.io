import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateFreshness } from '../check-freshness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('evaluateFreshness enforces truthsrc SHA, bank SHA, and 24h age SLA', () => {
  const nowMs = Date.parse('2026-11-27T12:00:00.000Z');
  const lock = {
    cohort: {
      truthsrcCommit: 'aaa111',
      bankCommit: 'bbb222',
      explorerSnapshot: 'ccc333',
    },
    generatedAt: '2026-11-27T08:00:00.000Z',
  };

  const passRes = evaluateFreshness({
    lock,
    upstream: { truthsrcCommit: 'aaa111', bankCommit: 'bbb222' },
    nowMs,
    maxAgeHours: 24,
  });
  assert.equal(passRes.fresh, true);
  assert.deepEqual(passRes.findings, []);

  const lagTruthsrc = evaluateFreshness({
    lock,
    upstream: { truthsrcCommit: 'zzz999', bankCommit: 'bbb222' },
    nowMs,
    maxAgeHours: 24,
  });
  assert.equal(lagTruthsrc.fresh, false);
  assert.equal(lagTruthsrc.truthsrcInSync, false);

  const lagBank = evaluateFreshness({
    lock,
    upstream: { truthsrcCommit: 'aaa111', bankCommit: 'yyy888' },
    nowMs,
    maxAgeHours: 24,
  });
  assert.equal(lagBank.fresh, false);
  assert.equal(lagBank.bankInSync, false);

  const staleAge = evaluateFreshness({
    lock: { ...lock, generatedAt: '2026-11-25T00:00:00.000Z' },
    upstream: { truthsrcCommit: 'aaa111', bankCommit: 'bbb222' },
    nowMs,
    maxAgeHours: 24,
  });
  assert.equal(staleAge.fresh, false);
  assert.equal(staleAge.withinAgeSla, false);
});

test('check-freshness --mode local passes on the current live workspace', (t) => {
  const truthsrcGit = join(ROOT, '..', 'metarch-truthsrc', '.git');
  const bankGit = join(ROOT, '..', 'bank-wealth-demo', '.git');
  if (!existsSync(truthsrcGit) || !existsSync(bankGit)) {
    t.skip('sibling repositories not checked out in standalone CI');
    return;
  }
  const stdout = execFileSync(process.execPath, [join(ROOT, 'tools/check-freshness.mjs'), '--mode', 'local'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const report = JSON.parse(stdout);
  assert.equal(report.schemaVersion, 'co-arising.freshness/v1');
  assert.equal(report.fresh, true);
  assert.equal(report.truthsrcInSync, true);
  assert.equal(report.bankInSync, true);
  assert.equal(report.withinAgeSla, true);
  assert.deepEqual(report.findings, []);
});
