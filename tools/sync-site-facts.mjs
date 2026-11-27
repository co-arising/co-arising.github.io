#!/usr/bin/env node
/**
 * Machine-driven fact lock producer & verifier for co-arising.github.io.
 *
 * Modes:
 *   --write [--truthsrc ../metarch-truthsrc] [--bank ../bank-wealth-demo]
 *       Builds `assets/data/facts.lock.json` directly from:
 *         - `exportCapabilitiesLock(truthsrc)` (`co-arising.capabilities/v1`)
 *         - `bank-wealth-demo/v2-pilot/.truthsrc/pilot-evidence.lock.json`
 *         - `assets/data/explorer/current.json` + active snapshot + `downloads/bank-workshop-v2.html`
 *   --check (default)
 *       Verifies `assets/data/facts.lock.json`, cohort lock across F-32..F-35,
 *       and EN/ZH status & home page alignment (runs standalone in CI without sibling repos).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FACTS_LOCK_PATH = join(ROOT, 'assets', 'data', 'facts.lock.json');
const ARTIFACT_MAPS_LOCK_PATH = join(ROOT, 'assets', 'data', 'artifact-maps.lock.json');

function parseArgs(argv) {
  const opts = {
    mode: 'check',
    truthsrc: resolve(ROOT, '..', 'metarch-truthsrc'),
    bank: resolve(ROOT, '..', 'bank-wealth-demo'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') opts.mode = 'write';
    else if (argv[i] === '--check') opts.mode = 'check';
    else if (argv[i] === '--truthsrc' && argv[i + 1]) opts.truthsrc = resolve(argv[++i]);
    else if (argv[i] === '--bank' && argv[i + 1]) opts.bank = resolve(argv[++i]);
  }
  return opts;
}

function stripTags(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/\s+/gu, ' ')
    .trim();
}

function extractMdFactRows(mdText) {
  const rows = new Map();
  for (const line of mdText.split('\n')) {
    const m = line.match(/^\|\s*(F-\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|$/u);
    if (m) {
      rows.set(m[1], {
        id: m[1],
        fact: m[2],
        value: m[3],
        captured: m[4].trim(),
        source: m[5],
        reproduce: m[6],
        raw: line,
      });
    }
  }
  return rows;
}

function extractHtmlRow(html, factId) {
  const m = html.match(new RegExp(`<tr\\s+id="${factId}"[^>]*>([\\s\\S]*?)<\\/tr>`, 'u'));
  return m ? stripTags(m[1]) : null;
}

function extractById(html, id) {
  const m = html.match(new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/div>`, 'u'));
  return m ? stripTags(m[1]) : null;
}

async function runWrite(opts) {
  const registryUrl = pathToFileURL(join(opts.truthsrc, 'lib', 'v2', 'surface-registry.mjs')).href;
  const { exportCapabilitiesLock } = await import(registryUrl);
  const capabilities = exportCapabilitiesLock(opts.truthsrc);

  const pilotEvidencePath = join(opts.bank, 'v2-pilot', '.truthsrc', 'pilot-evidence.lock.json');
  if (!existsSync(pilotEvidencePath)) {
    throw new Error(`Missing pilot-evidence.lock.json at ${pilotEvidencePath} — run "npm run v2:release-verify" in bank-wealth-demo first`);
  }
  const pilot = JSON.parse(readFileSync(pilotEvidencePath, 'utf8'));
  if (!pilot.truthsrc?.pinMatched) {
    throw new Error(`pilot-evidence.lock.json truthsrc pin mismatch (actual=${pilot.truthsrc?.actualCommit}, pinned=${pilot.truthsrc?.pinnedCommit})`);
  }

  const currentJson = JSON.parse(readFileSync(join(ROOT, 'assets', 'data', 'explorer', 'current.json'), 'utf8'));
  const snapId = currentJson.snapshot;
  const manifest = JSON.parse(readFileSync(join(ROOT, 'assets', 'data', 'explorer', 'snapshots', snapId, 'manifest.json'), 'utf8'));
  const workshopBytes = statSync(join(ROOT, 'downloads', 'bank-workshop-v2.html')).size;

  const siteFactsRows = extractMdFactRows(readFileSync(join(ROOT, 'SITE-FACTS.md'), 'utf8'));
  const capturedDate = siteFactsRows.get('F-32')?.captured || new Date().toISOString().slice(0, 10);

  let bankHeadCommit = pilot.bank.commit;
  for (const bin of ['/Library/Developer/CommandLineTools/usr/bin/git', 'git']) {
    try {
      const out = execFileSync(bin, ['-C', opts.bank, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (out) { bankHeadCommit = out; break; }
    } catch {
      // ignore and fall back to pilot-evidence.lock.json
    }
  }

  const factsLock = {
    schemaVersion: 'co-arising.site-facts-lock/v1',
    cohort: {
      truthsrcCommit: capabilities.toolCommit,
      truthsrcShort: capabilities.toolCommit ? capabilities.toolCommit.slice(0, 7) : null,
      bankCommit: bankHeadCommit,
      bankShort: bankHeadCommit ? bankHeadCommit.slice(0, 7) : pilot.bank.short,
      explorerSnapshot: snapId,
      explorerSnapshotShort: snapId ? snapId.slice(0, 8) : null,
      capturedDate,
    },
    capabilities: {
      version: capabilities.toolVersion,
      runtimeDependencies: capabilities.runtimeDependencies,
      nodeEngine: capabilities.nodeEngine,
      cliCommands: capabilities.cliCommands,
      mcpTotal: capabilities.mcpTools.total,
      mcpV1: capabilities.mcpTools.v1.length,
      mcpV2: capabilities.mcpTools.v2.length,
      v2McpTools: capabilities.mcpTools.v2,
      skills: capabilities.skills,
      effectProtocols: capabilities.effectProtocols,
      errorCodeCount: capabilities.errorCodeCount,
      targetArtifactCatalogs: capabilities.targetArtifactCatalogs ?? [],
      surfaceSha256: capabilities.surfaceSha256,
    },
    pilot: {
      governedFiles: pilot.coverage.totalGovernedFiles,
      coverageRatio: pilot.coverage.coverageRatio,
      countsByTier: pilot.coverage.countsByTier,
      countsByEvidence: pilot.coverage.countsByEvidence,
      tsSuites: pilot.provenance.tsSuites,
      scalaSuites: pilot.provenance.scalaSuites,
      lockedFiles: pilot.provenance.lockedFiles,
      onionCheckedFiles: pilot.provenance.onionCheckedFiles,
      onionViolations: pilot.provenance.onionViolations,
      sbtRuntimeFilesCount: pilot.provenance.sbtRuntimeFilesCount,
      mutationTs: pilot.provenance.mutationTs,
      mutationScala: pilot.provenance.mutationScala,
      tckPassed: pilot.tck.passedCount,
      graphNodes: pilot.graph.nodes,
      graphKinds: pilot.graph.kinds,
      graphEdges: pilot.graph.edges,
      clozeSlots: pilot.graph.clozeSlots,
      evidenceSha256: pilot.evidenceSha256,
    },
    explorer: {
      activeSnapshot: snapId,
      publishedFiles: manifest.counts?.publishedFiles ?? 0,
      withheldFiles: manifest.counts?.withheldFiles ?? 0,
      totalFiles: manifest.counts?.files ?? 0,
      workshopBytes,
    },
    generatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(factsLock, null, 2) + '\n';
  if (/\/Users\/|\/home\//u.test(serialized)) {
    throw new Error('Private local path leaked into assets/data/facts.lock.json');
  }
  writeFileSync(FACTS_LOCK_PATH, serialized, 'utf8');
  console.log(JSON.stringify({ mode: 'write', path: 'assets/data/facts.lock.json', cohort: factsLock.cohort }, null, 2));
}

function runCheck() {
  const errors = [];
  if (!existsSync(FACTS_LOCK_PATH)) {
    console.log(JSON.stringify({ mode: 'check', errors: ['Missing assets/data/facts.lock.json'] }, null, 2));
    process.exit(1);
  }
  const lockRaw = readFileSync(FACTS_LOCK_PATH, 'utf8');
  if (/\/Users\/|\/home\//u.test(lockRaw)) {
    errors.push('assets/data/facts.lock.json contains local machine path');
  }
  const lock = JSON.parse(lockRaw);
  if (lock.schemaVersion !== 'co-arising.site-facts-lock/v1') {
    errors.push(`unexpected schemaVersion: ${lock.schemaVersion}`);
  }
  if (!Array.isArray(lock.capabilities?.cliCommands) || lock.capabilities.cliCommands.length === 0) {
    errors.push('facts.lock.json missing capabilities.cliCommands');
  }

  const currentJson = JSON.parse(readFileSync(join(ROOT, 'assets', 'data', 'explorer', 'current.json'), 'utf8'));
  if (currentJson.snapshot !== lock.cohort?.explorerSnapshot) {
    errors.push(`current.json snapshot ${currentJson.snapshot} !== facts.lock ${lock.cohort?.explorerSnapshot}`);
  }

  const mdRows = extractMdFactRows(readFileSync(join(ROOT, 'SITE-FACTS.md'), 'utf8'));
  const date = lock.cohort?.capturedDate;
  for (const fid of ['F-32', 'F-33', 'F-34', 'F-35']) {
    const row = mdRows.get(fid);
    if (!row) {
      errors.push(`SITE-FACTS.md missing ${fid}`);
      continue;
    }
    if (date && row.captured !== date) {
      errors.push(`Cohort date drift: SITE-FACTS.md ${fid} captured=${row.captured} !== cohort ${date}`);
    }
  }

  const f32 = mdRows.get('F-32');
  const f33 = mdRows.get('F-33');
  const f34 = mdRows.get('F-34');
  const f35 = mdRows.get('F-35');

  if (f32 && lock.cohort?.truthsrcShort && !f32.raw.includes(lock.cohort.truthsrcShort)) {
    errors.push(`SITE-FACTS.md F-32 missing truthsrcShort ${lock.cohort.truthsrcShort}`);
  }
  if (f32 && !f32.raw.includes(`${lock.capabilities.mcpTotal} MCP tools`)) {
    errors.push(`SITE-FACTS.md F-32 missing "${lock.capabilities.mcpTotal} MCP tools"`);
  }
  if (f33 && lock.cohort?.bankShort && !f33.raw.includes(lock.cohort.bankShort)) {
    errors.push(`SITE-FACTS.md F-33 missing bankShort ${lock.cohort.bankShort}`);
  }
  const covRatioStr = `${lock.pilot.governedFiles}/${lock.pilot.governedFiles}`;
  const suiteStr = `${lock.pilot.tsSuites} TS + ${lock.pilot.scalaSuites} Scala`;
  if (f33 && !f33.raw.includes(`${covRatioStr} = 100%`)) {
    errors.push(`SITE-FACTS.md F-33 missing "${covRatioStr} = 100%"`);
  }
  if (f33 && !f33.raw.includes(suiteStr)) {
    errors.push(`SITE-FACTS.md F-33 missing "${suiteStr}"`);
  }
  if (f34 && !f34.raw.includes(`${lock.pilot.graphNodes} nodes across ${lock.pilot.graphKinds} kinds`)) {
    errors.push(`SITE-FACTS.md F-34 missing "${lock.pilot.graphNodes} nodes across ${lock.pilot.graphKinds} kinds"`);
  }
  if (f34 && !f34.raw.includes(`${lock.pilot.graphEdges} edges`)) {
    errors.push(`SITE-FACTS.md F-34 missing "${lock.pilot.graphEdges} edges"`);
  }
  if (f35 && lock.cohort?.explorerSnapshot && !f35.raw.includes(lock.cohort.explorerSnapshot)) {
    errors.push(`SITE-FACTS.md F-35 missing active snapshot ${lock.cohort.explorerSnapshot}`);
  }

  const enStatus = readFileSync(join(ROOT, 'status', 'index.html'), 'utf8');
  const zhStatus = readFileSync(join(ROOT, 'zh', 'status', 'index.html'), 'utf8');
  for (const [label, html] of [['status/index.html', enStatus], ['zh/status/index.html', zhStatus]]) {
    for (const fid of ['F-32', 'F-33', 'F-34', 'F-35']) {
      const row = extractHtmlRow(html, fid);
      if (!row) {
        errors.push(`${label} missing ${fid}`);
      } else if (date && !row.includes(date)) {
        errors.push(`${label} ${fid} missing cohort date ${date}`);
      }
    }
    const r32 = extractHtmlRow(html, 'F-32') ?? '';
    const r33 = extractHtmlRow(html, 'F-33') ?? '';
    const r35 = extractHtmlRow(html, 'F-35') ?? '';
    if (lock.cohort?.truthsrcShort && !r32.includes(lock.cohort.truthsrcShort)) {
      errors.push(`${label} F-32 missing truthsrcShort ${lock.cohort.truthsrcShort}`);
    }
    if (lock.cohort?.bankShort && !r33.includes(lock.cohort.bankShort)) {
      errors.push(`${label} F-33 missing bankShort ${lock.cohort.bankShort}`);
    }
    if (!r33.includes(covRatioStr) || !r33.includes(suiteStr)) {
      errors.push(`${label} F-33 missing ${covRatioStr} or ${suiteStr}`);
    }
    if (lock.cohort?.explorerSnapshotShort && !r35.includes(lock.cohort.explorerSnapshotShort)) {
      errors.push(`${label} F-35 missing snapshot prefix ${lock.cohort.explorerSnapshotShort}`);
    }
  }

  const enHome = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const zhHome = readFileSync(join(ROOT, 'zh', 'index.html'), 'utf8');
  const enSummary = extractById(enHome, 'v2-ga-summary') ?? '';
  const zhSummary = extractById(zhHome, 'v2-ga-summary') ?? '';

  if (!enSummary.includes(`${lock.capabilities.mcpTotal} MCP tools`) || !enSummary.includes(suiteStr) || !enSummary.includes(covRatioStr)) {
    errors.push(`index.html #v2-ga-summary out of sync with facts.lock.json`);
  }
  if (!zhSummary.includes(`${lock.capabilities.mcpTotal} 个 MCP 工具`) || !zhSummary.includes(suiteStr) || !zhSummary.includes(covRatioStr)) {
    errors.push(`zh/index.html #v2-ga-summary out of sync with facts.lock.json`);
  }

  // Verify Artifact Type Map lock & bilingual articles stay synchronized with metarch-truthsrc catalogs
  if (!existsSync(ARTIFACT_MAPS_LOCK_PATH)) {
    errors.push('Missing assets/data/artifact-maps.lock.json');
  } else {
    const mapsLock = JSON.parse(readFileSync(ARTIFACT_MAPS_LOCK_PATH, 'utf8'));
    if (mapsLock.schemaVersion !== 'co-arising.artifact-maps-lock/v1') {
      errors.push(`unexpected artifact-maps.lock schemaVersion: ${mapsLock.schemaVersion}`);
    }
    if (!mapsLock.contractDoc || !existsSync(join(ROOT, mapsLock.contractDoc))) {
      errors.push(`Missing artifact-maps contractDoc: ${mapsLock.contractDoc}`);
    }
    const manifestPath = join(ROOT, 'content', 'articles', 'manifest.json');
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { articles: [] };
    const manifestBySlug = new Map((manifest.articles ?? []).map(a => [a.slug, a]));

    const catalogs = lock.capabilities?.targetArtifactCatalogs ?? [];
    if (catalogs.length === 0) {
      errors.push('facts.lock.json missing capabilities.targetArtifactCatalogs');
    }
    for (const cat of catalogs) {
      const entry = mapsLock.maps?.[cat.id];
      if (!entry) {
        errors.push(`artifact-maps.lock.json missing registered bilingual map for target catalog "${cat.id}"`);
        continue;
      }
      if (entry.catalogSha256 !== cat.catalogSha256) {
        errors.push(`artifact-maps.lock.json ${cat.id} catalogSha256 mismatch (${entry.catalogSha256} !== ${cat.catalogSha256}) — update the bilingual map article & lock after upgrading Artifact Types`);
      }
      if (entry.artifactKindCount !== cat.artifactKindCount || entry.producerCount !== cat.producerCount) {
        errors.push(`artifact-maps.lock.json ${cat.id} counts differ from facts.lock (kinds ${entry.artifactKindCount}/${cat.artifactKindCount}, producers ${entry.producerCount}/${cat.producerCount})`);
      }
      if (lock.cohort?.truthsrcShort && entry.truthsrcShort !== lock.cohort.truthsrcShort) {
        errors.push(`artifact-maps.lock.json ${cat.id} truthsrcShort ${entry.truthsrcShort} !== cohort ${lock.cohort.truthsrcShort}`);
      }
      const artMeta = manifestBySlug.get(entry.slug);
      if (!artMeta || !artMeta.source_en) {
        errors.push(`content/articles/manifest.json missing bilingual entry for artifact map slug "${entry.slug}"`);
        continue;
      }
      const shortCatalog = cat.catalogSha256.slice(0, 12);
      for (const [label, fname] of [['zh', artMeta.source], ['en', artMeta.source_en]]) {
        const mdPath = join(ROOT, 'content', 'articles', fname);
        if (!existsSync(mdPath)) {
          errors.push(`Missing artifact map article source (${label}): content/articles/${fname}`);
          continue;
        }
        const mdText = readFileSync(mdPath, 'utf8');
        if (lock.cohort?.truthsrcShort && !mdText.includes(lock.cohort.truthsrcShort)) {
          errors.push(`content/articles/${fname} missing pinned truthsrc commit ${lock.cohort.truthsrcShort}`);
        }
        if (!mdText.includes(shortCatalog)) {
          errors.push(`content/articles/${fname} missing catalogSha256 prefix ${shortCatalog}`);
        }
      }
    }

    // Verify commit-pinned compiler architecture & minefield map articles stay bound to cohort truthsrcCommit
    for (const [archKey, entry] of Object.entries(mapsLock.architectureMaps ?? {})) {
      if (lock.cohort?.truthsrcShort && entry.truthsrcShort !== lock.cohort.truthsrcShort) {
        errors.push(`artifact-maps.lock.json architectureMaps.${archKey} truthsrcShort ${entry.truthsrcShort} !== cohort ${lock.cohort.truthsrcShort}`);
      }
      if (lock.cohort?.truthsrcCommit && entry.truthsrcCommit && entry.truthsrcCommit !== lock.cohort.truthsrcCommit) {
        errors.push(`artifact-maps.lock.json architectureMaps.${archKey} truthsrcCommit ${entry.truthsrcCommit} !== cohort ${lock.cohort.truthsrcCommit}`);
      }
      const artMeta = manifestBySlug.get(entry.slug);
      if (!artMeta || !artMeta.source_en) {
        errors.push(`content/articles/manifest.json missing bilingual entry for architecture map slug "${entry.slug}"`);
        continue;
      }
      for (const [label, fname] of [['zh', artMeta.source], ['en', artMeta.source_en]]) {
        const mdPath = join(ROOT, 'content', 'articles', fname);
        if (!existsSync(mdPath)) {
          errors.push(`Missing architecture map article source (${label}): content/articles/${fname}`);
          continue;
        }
        const mdText = readFileSync(mdPath, 'utf8');
        if (lock.cohort?.truthsrcShort && !mdText.includes(lock.cohort.truthsrcShort)) {
          errors.push(`content/articles/${fname} missing pinned truthsrc commit ${lock.cohort.truthsrcShort}`);
        }
      }
    }
  }

  console.log(JSON.stringify({
    mode: 'check',
    schemaVersion: lock.schemaVersion,
    cohort: lock.cohort,
    cliCommandsCount: lock.capabilities.cliCommands.length,
    errors,
  }, null, 2));
  process.exit(errors.length === 0 ? 0 : 1);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.mode === 'write') {
  await runWrite(opts);
} else {
  runCheck();
}
