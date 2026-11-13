#!/usr/bin/env node
/* Check paired static examples; never executes their commands or edits source trees. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const decode = (text) => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
  if (entity.startsWith('#')) return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()];
});

export function extractExamples(html) {
  const examples = new Map();
  for (const match of html.matchAll(/<pre\b([^>]*)>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/g)) {
    const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])]));
    const id = attributes['data-example'];
    if (!id) continue;
    if (examples.has(id)) throw new Error(`Duplicate example: ${id}`);
    if (/<[a-z][^>]*>/i.test(match[2])) throw new Error(`${id}: code must be plain escaped text, not nested markup`);
    examples.set(id, { text: decode(match[2]), attributes });
  }
  return examples;
}

export function commandFindings(id, text) {
  const errors = [];
  for (const raw of text.replace(/\\\r?\n\s*/g, ' ').split('\n')) {
    const line = raw.trim();
    if (!/(?:^|&&\s*)(?:node|truthsrc)\s/.test(line)) continue;
    if (!/\b(generate-project|query-project|status-project|verify-project|view-project)\b/.test(line)) continue;
    for (const flag of ['--project', '--out']) {
      if (!new RegExp(`${flag}\\s+(?!-)[^\\s]+`).test(line)) errors.push(`${id}: missing ${flag}`);
    }
    if (/--out\s+["']?\.["']?(?:\s|$)/.test(line)) errors.push(`${id}: output must not be the author root`);
    if (line.includes('…') || /--symbol\b/.test(line)) errors.push(`${id}: abbreviated or unsupported command`);
  }
  return errors;
}

export function checkExamples(root = ROOT, bankRoot = null) {
  const errors = [];
  const checked = [];
  for (const route of ['', 'guide/', 'dsl/', 'explorer/']) {
    const en = extractExamples(readFileSync(resolve(root, route, 'index.html'), 'utf8'));
    const zh = extractExamples(readFileSync(resolve(root, 'zh', route, 'index.html'), 'utf8'));
    if (!en.size) errors.push(`${route || '/'}: no marked examples`);
    for (const id of new Set([...en.keys(), ...zh.keys()])) {
      const first = en.get(id), second = zh.get(id);
      if (!first || !second || first.text !== second.text) {
        errors.push(`${route || '/'}: EN/ZH payload differs for ${id}`);
        continue;
      }
      errors.push(...commandFindings(id, first.text));
      const hash = createHash('sha256').update(first.text).digest('hex');
      for (const sample of [first, second]) {
        if (sample.attributes['data-source-sha256'] && hash !== sample.attributes['data-source-sha256']) {
          errors.push(`${id}: example bytes differ from the captured source fingerprint`);
        }
      }
      const sourceFile = first.attributes['data-source-file'];
      if (id === 'initialize-account-file' && (!sourceFile || !first.attributes['data-source-sha256'])) errors.push(`${id}: source fingerprint missing`);
      if (sourceFile !== second.attributes['data-source-file']) errors.push(`${id}: source references differ`);
      if (bankRoot && sourceFile) {
        const file = resolve(bankRoot, sourceFile);
        const local = relative(resolve(bankRoot), file);
        if (local.startsWith('..') || isAbsolute(local)) errors.push(`${id}: source path escapes bank root`);
        else if (readFileSync(file, 'utf8') !== first.text) errors.push(`${id}: supplied bank checkout differs from captured example`);
      }
      checked.push({ page: route || '/', id, bytes: Buffer.byteLength(first.text), sourceChecked: Boolean(bankRoot && sourceFile) });
    }
  }
  return { examples: checked, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--bank-root' || !isAbsolute(args[1]))) throw new Error('Usage: node tools/check-examples.mjs [--bank-root /absolute/checkout]');
    const result = checkExamples(ROOT, args[1] || null);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
