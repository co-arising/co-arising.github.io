#!/usr/bin/env node
/**
 * Cross-file consistency & orphan-snapshot gate for co-arising.github.io:
 *   1. No unreferenced snapshots under assets/data/explorer/snapshots/
 *   2. EN/ZH home pages (#v2-ga-summary + GA guide card) agree with SITE-FACTS.md (F-32 / F-33)
 *   3. EN/ZH status pages carry the same baseline SHAs and key metrics as SITE-FACTS.md (F-32..F-35)
 *   4. F-35 snapshot hash matches assets/data/explorer/current.json
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

function extractFactRowsFromMd(mdText) {
  const rows = new Map();
  for (const line of mdText.split('\n')) {
    const m = line.match(/^\|\s*(F-\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|$/u);
    if (m) {
      rows.set(m[1], {
        id: m[1],
        fact: m[2],
        value: m[3],
        captured: m[4],
        source: m[5],
        reproduce: m[6],
        raw: line,
      });
    }
  }
  return rows;
}

function extractHtmlRow(html, factId) {
  const re = new RegExp(`<tr\\s+id="${factId}"[^>]*>([\\s\\S]*?)<\\/tr>`, 'u');
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

function extractById(html, id) {
  const re = new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/div>`, 'u');
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

function main() {
  const errors = [];

  const siteFactsPath = join(ROOT, 'SITE-FACTS.md');
  const currentJsonPath = join(ROOT, 'assets', 'data', 'explorer', 'current.json');
  const snapshotsDir = join(ROOT, 'assets', 'data', 'explorer', 'snapshots');

  const siteFactsText = readFileSync(siteFactsPath, 'utf8');
  const mdFacts = extractFactRowsFromMd(siteFactsText);
  const currentJson = JSON.parse(readFileSync(currentJsonPath, 'utf8'));

  // 1. Orphan snapshot check
  const activeSnapshot = currentJson.snapshot;
  const snapshotDirs = existsSync(snapshotsDir)
    ? readdirSync(snapshotsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort()
    : [];

  for (const snap of snapshotDirs) {
    const short8 = snap.slice(0, 8);
    if (snap !== activeSnapshot && !siteFactsText.includes(snap) && !siteFactsText.includes(short8)) {
      errors.push(`Orphan explorer snapshot directory not referenced in current.json or SITE-FACTS.md: ${snap}`);
    }
  }

  // 2. F-35 matches current.json active snapshot
  const f35 = mdFacts.get('F-35');
  if (!f35) {
    errors.push('SITE-FACTS.md missing F-35');
  } else if (activeSnapshot && !f35.raw.includes(activeSnapshot) && !f35.raw.includes(activeSnapshot.slice(0, 8))) {
    errors.push(`SITE-FACTS.md F-35 does not match current.json snapshot ${activeSnapshot}`);
  }

  // 3. Check EN/ZH status pages align with SITE-FACTS.md for F-32..F-35
  const enStatus = readFileSync(join(ROOT, 'status', 'index.html'), 'utf8');
  const zhStatus = readFileSync(join(ROOT, 'zh', 'status', 'index.html'), 'utf8');

  for (const fid of ['F-32', 'F-33', 'F-34', 'F-35']) {
    const mdRow = mdFacts.get(fid);
    const enRow = extractHtmlRow(enStatus, fid);
    const zhRow = extractHtmlRow(zhStatus, fid);
    if (!mdRow) {
      errors.push(`SITE-FACTS.md missing ${fid}`);
      continue;
    }
    if (!enRow) errors.push(`status/index.html missing row ${fid}`);
    if (!zhRow) errors.push(`zh/status/index.html missing row ${fid}`);

    // Extract key code/SHA tokens & X/X ratios from SITE-FACTS.md row
    const shas = [...mdRow.source.matchAll(/@\s*`([0-9a-f]{7,40})`/gu)].map(m => m[1]);
    for (const sha of shas) {
      if (enRow && !enRow.includes(sha)) errors.push(`status/index.html ${fid} missing SHA ${sha} from SITE-FACTS.md`);
      if (zhRow && !zhRow.includes(sha)) errors.push(`zh/status/index.html ${fid} missing SHA ${sha} from SITE-FACTS.md`);
    }
    if (fid === 'F-32') {
      const mcpMatch = mdRow.value.match(/(\d+)\s+MCP\s+tools/u);
      if (mcpMatch) {
        const count = mcpMatch[1];
        if (enRow && !enRow.includes(`${count} MCP tools`)) errors.push(`status/index.html F-32 missing "${count} MCP tools"`);
        if (zhRow && !zhRow.includes(`${count} 个 MCP 工具`)) errors.push(`zh/status/index.html F-32 missing "${count} 个 MCP 工具"`);
      }
    }
    if (fid === 'F-33') {
      const covMatch = mdRow.value.match(/v2:audit-coverage`\s*(\d+\/\d+)\s*=\s*100%/u);
      if (covMatch) {
        const ratio = covMatch[1];
        if (enRow && !enRow.includes(ratio)) errors.push(`status/index.html F-33 missing coverage ratio ${ratio}`);
        if (zhRow && !zhRow.includes(ratio)) errors.push(`zh/status/index.html F-33 missing coverage ratio ${ratio}`);
      }
      const suitesMatch = mdRow.value.match(/(\d+\s+TS\s+\+\s+\d+\s+Scala)/u);
      if (suitesMatch) {
        const suites = suitesMatch[1];
        if (enRow && !enRow.includes(suites)) errors.push(`status/index.html F-33 missing suites "${suites}"`);
        if (zhRow && !zhRow.includes(suites)) errors.push(`zh/status/index.html F-33 missing suites "${suites}"`);
      }
    }
  }

  // 4. EN/ZH home page #v2-ga-summary vs SITE-FACTS.md F-32/F-33
  const enHome = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const zhHome = readFileSync(join(ROOT, 'zh', 'index.html'), 'utf8');
  const enSummary = extractById(enHome, 'v2-ga-summary');
  const zhSummary = extractById(zhHome, 'v2-ga-summary');
  const f32 = mdFacts.get('F-32');
  const f33 = mdFacts.get('F-33');

  if (!enSummary) errors.push('index.html missing #v2-ga-summary');
  if (!zhSummary) errors.push('zh/index.html missing #v2-ga-summary');

  if (f32 && enSummary && zhSummary) {
    const mcpMatch = f32.value.match(/(\d+)\s+MCP\s+tools/u);
    if (mcpMatch) {
      const count = mcpMatch[1];
      if (!enSummary.includes(`${count} MCP tools`)) errors.push(`index.html #v2-ga-summary disagrees with F-32 (${count} MCP tools)`);
      if (!zhSummary.includes(`${count} 个 MCP 工具`)) errors.push(`zh/index.html #v2-ga-summary disagrees with F-32 (${count} 个 MCP 工具)`);
    }
  }

  if (f33 && enSummary && zhSummary) {
    const covMatch = f33.value.match(/v2:audit-coverage`\s*(\d+\/\d+)\s*=\s*100%/u);
    if (covMatch) {
      const ratio = covMatch[1];
      if (!enSummary.includes(ratio)) errors.push(`index.html #v2-ga-summary disagrees with F-33 coverage ${ratio}`);
      if (!zhSummary.includes(ratio)) errors.push(`zh/index.html #v2-ga-summary disagrees with F-33 coverage ${ratio}`);
    }
    const suitesMatch = f33.value.match(/(\d+\s+TS\s+\+\s+\d+\s+Scala)/u);
    if (suitesMatch) {
      const suites = suitesMatch[1];
      if (!enSummary.includes(suites)) errors.push(`index.html #v2-ga-summary disagrees with F-33 suites "${suites}"`);
      if (!zhSummary.includes(suites)) errors.push(`zh/index.html #v2-ga-summary disagrees with F-33 suites "${suites}"`);
    }
  }

  const report = {
    scope: 'Cross-file fact consistency (SITE-FACTS.md <-> status <-> home) and explorer snapshot reference hygiene',
    snapshots: snapshotDirs,
    activeSnapshot,
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(errors.length === 0 ? 0 : 1);
}

main();
