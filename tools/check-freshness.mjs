#!/usr/bin/env node
/**
 * Freshness SLA verifier for co-arising.github.io.
 *
 * Compares `assets/data/facts.lock.json` cohort SHAs & timestamp against either:
 *   - `--mode local`  (default): sibling `../metarch-truthsrc` and `../bank-wealth-demo` HEAD commits
 *   - `--mode github`: GitHub REST API commits on upstream default/pilot branches
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FACTS_LOCK_PATH = join(ROOT, 'assets', 'data', 'facts.lock.json');

function parseArgs(argv) {
  const opts = {
    mode: 'local',
    maxAgeHours: 24,
    truthsrc: resolve(ROOT, '..', 'metarch-truthsrc'),
    bank: resolve(ROOT, '..', 'bank-wealth-demo'),
    truthsrcBranch: 'main',
    bankBranch: 'feat/co-arising-v2-pilot',
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode' && argv[i + 1]) opts.mode = argv[++i];
    else if (argv[i] === '--max-age-hours' && argv[i + 1]) opts.maxAgeHours = Number(argv[++i]);
    else if (argv[i] === '--truthsrc' && argv[i + 1]) opts.truthsrc = resolve(argv[++i]);
    else if (argv[i] === '--bank' && argv[i + 1]) opts.bank = resolve(argv[++i]);
    else if (argv[i] === '--truthsrc-branch' && argv[i + 1]) opts.truthsrcBranch = argv[++i];
    else if (argv[i] === '--bank-branch' && argv[i + 1]) opts.bankBranch = argv[++i];
  }
  return opts;
}

function readLocalGitHead(repoDir) {
  const candidates = ['/Library/Developer/CommandLineTools/usr/bin/git', 'git'];
  for (const bin of candidates) {
    try {
      const sha = execFileSync(bin, ['-C', repoDir, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (sha) return sha;
    } catch {
      // try next git binary
    }
  }
  throw new Error(`Unable to read git HEAD for ${repoDir}`);
}

async function fetchGitHubHead(repo, branch) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'co-arising-freshness-check',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const url = `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${url} returned HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data?.sha) {
    throw new Error(`GitHub API ${url} response missing commit sha`);
  }
  return data.sha;
}

export function evaluateFreshness({
  lock,
  upstream,
  nowMs = Date.now(),
  maxAgeHours = 24,
} = {}) {
  const findings = [];
  const cohortTruthsrc = lock?.cohort?.truthsrcCommit ?? null;
  const cohortBank = lock?.cohort?.bankCommit ?? null;

  const truthsrcInSync = Boolean(cohortTruthsrc && upstream?.truthsrcCommit && cohortTruthsrc === upstream.truthsrcCommit);
  const bankInSync = Boolean(cohortBank && upstream?.bankCommit && cohortBank === upstream.bankCommit);

  if (!truthsrcInSync) {
    findings.push(`truthsrc commit drift: locked=${cohortTruthsrc ?? 'none'}, upstream=${upstream?.truthsrcCommit ?? 'unknown'}`);
  }
  if (!bankInSync) {
    findings.push(`bank-wealth-demo commit drift: locked=${cohortBank ?? 'none'}, upstream=${upstream?.bankCommit ?? 'unknown'}`);
  }

  const generatedMs = lock?.generatedAt ? Date.parse(lock.generatedAt) : Number.NaN;
  const ageHours = Number.isFinite(generatedMs)
    ? Number(((nowMs - generatedMs) / 3_600_000).toFixed(3))
    : null;
  const withinAgeSla = ageHours !== null && ageHours >= 0 && ageHours <= maxAgeHours;

  if (!withinAgeSla) {
    findings.push(`facts.lock.json age SLA exceeded: ageHours=${ageHours ?? 'missing'}, maxAgeHours=${maxAgeHours}`);
  }

  const fresh = truthsrcInSync && bankInSync && withinAgeSla;
  return {
    schemaVersion: 'co-arising.freshness/v1',
    fresh,
    truthsrcInSync,
    bankInSync,
    withinAgeSla,
    ageHours,
    maxAgeHours,
    cohort: {
      truthsrcCommit: cohortTruthsrc,
      bankCommit: cohortBank,
      explorerSnapshot: lock?.cohort?.explorerSnapshot ?? null,
      generatedAt: lock?.generatedAt ?? null,
    },
    upstream: {
      truthsrcCommit: upstream?.truthsrcCommit ?? null,
      bankCommit: upstream?.bankCommit ?? null,
    },
    findings,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const lock = JSON.parse(readFileSync(FACTS_LOCK_PATH, 'utf8'));

  let upstream;
  if (opts.mode === 'github') {
    const [truthsrcCommit, bankCommit] = await Promise.all([
      fetchGitHubHead('co-arising/metarch-truthsrc', opts.truthsrcBranch),
      fetchGitHubHead('co-arising/bank-wealth-demo', opts.bankBranch),
    ]);
    upstream = { truthsrcCommit, bankCommit };
  } else if (opts.mode === 'local') {
    upstream = {
      truthsrcCommit: readLocalGitHead(opts.truthsrc),
      bankCommit: readLocalGitHead(opts.bank),
    };
  } else {
    throw new Error(`Unsupported --mode "${opts.mode}" (expected local or github)`);
  }

  const result = evaluateFreshness({
    lock,
    upstream,
    maxAgeHours: opts.maxAgeHours,
  });
  const output = { mode: opts.mode, ...result };
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.fresh ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(JSON.stringify({ schemaVersion: 'co-arising.freshness/v1', fresh: false, error: err.message }, null, 2));
    process.exit(1);
  });
}
