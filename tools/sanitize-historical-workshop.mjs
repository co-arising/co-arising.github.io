#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedOriginal = '850e877000329a3f530d4496f6dac00b6ddfb5a1d13a55050143a65fc2fff390';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function sanitizeHistoricalWorkshop(bytes) {
  assert.equal(sha(bytes), expectedOriginal, 'unexpected historical input; inspect before replacing');
  const html = bytes.toString('utf8');
  const match = html.match(/(<script id="workshop-view" type="application\/json">)([\s\S]*?)(<\/script>)/);
  assert.ok(match, 'historical view missing');
  const original = JSON.parse(match[2]);
  const view = structuredClone(original);
  for (const key of ['project', 'output']) {
    assert.match(view.verification[key], /^\/Users\//, 'unexpected verification path');
    view.verification[key] = '[local path withheld in public copy]';
  }
  const encode = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replaceAll(String.fromCharCode(8232), '\\u2028').replaceAll(String.fromCharCode(8233), '\\u2029');
  let result = html.replace(match[0], () => match[1] + encode(view) + match[3]);
  result = result.replace('<div class="workspace">', '<p class="snapshot-ribbon">历史公开副本 · 2026-11-15 仅移除两处本机验证路径；2026-11-06 的代码摘录、映射、指纹与验收状态未重新认证。</p>\n<div class="workspace">');
  assert.doesNotMatch(result, /\/Users\//);
  const finalView = JSON.parse(result.match(/<script id="workshop-view" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const restored = structuredClone(finalView);
  restored.verification.project = original.verification.project;
  restored.verification.output = original.verification.output;
  assert.deepEqual(restored, original, 'redaction changed historical evidence');
  const executable = input => [...input.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.deepEqual(executable(result), executable(html), 'executable/CSP content changed');
  return Buffer.from(result);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  assert.ok(input && output && resolve(input) !== resolve(output), 'usage: sanitize-historical-workshop.mjs INPUT NEW_OUTPUT');
  const source = readFileSync(input), result = sanitizeHistoricalWorkshop(source);
  writeFileSync(output, result, { flag: 'wx' });
  console.log(JSON.stringify({ originalSha256: sha(source), publicSha256: sha(result), bytes: result.length, changedFields: ['verification.project', 'verification.output'], historicalEvidencePreserved: true }));
}
