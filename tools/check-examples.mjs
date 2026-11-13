#!/usr/bin/env node
/* Static text/byte/shell-syntax checks. Never execute examples or edit source trees. */
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ROUTES = ['', 'why-co-arising/', 'guide/', 'dsl/', 'pipeline/', 'bank-demo/', 'explorer/', 'compare/', 'status/'];
export const BASELINE_IDS = ['home-quickstart', 'install-source', 'counter-first', 'counter-reverse', 'counter-verify', 'counter-update', 'bank-convenience', 'initialize-account-file', 'graph-rebuild'];
const PROJECT_COMMANDS = new Set(['generate-project', 'query-project', 'status-project', 'verify-project', 'view-project']);
// The tutorial's declared CLI surface, not an assertion about every toolchain command.
const DECLARED_COMMANDS = new Set([...PROJECT_COMMANDS, 'init', 'graph', 'validate', 'roundtrip', 'compile', 'compile-products', 'mcp', '--help', '--version']);
const decode = (text) => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
  if (entity.startsWith('#')) return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()];
});

export function extractExamples(html) {
  const examples = new Map();
  for (const match of html.matchAll(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi)) {
    const attributes = {};
    for (const a of match[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) {
      if (Object.hasOwn(attributes, a[1])) throw new Error(`Duplicate example attribute: ${a[1]}`);
      attributes[a[1]] = decode(a[3]);
    }
    if (!/\bdata-example\b/.test(match[1])) continue;
    const id = attributes['data-example'];
    if (!id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Malformed stable data-example ID');
    if (examples.has(id)) throw new Error(`Duplicate example: ${id}`);
    const code = match[2].match(/^\s*<code(?:\s+[^>]*)?>([\s\S]*?)<\/code>\s*$/i);
    if (!code || /<[a-z/][^>]*>/i.test(code[1])) throw new Error(`${id}: code must be plain escaped text, not nested markup`);
    examples.set(id, { text: decode(code[1]), attributes });
  }
  return examples;
}

export function shellSyntaxFindings(id, text) {
  // bash -n parses stdin only: no evaluation, substitution, startup files or example execution.
  const checked = spawnSync('bash', ['--noprofile', '--norc', '-n'], {
    input: text, encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    env: { PATH: process.env.PATH || '/usr/bin:/bin', LC_ALL: 'C' },
  });
  if (checked.error) return [`${id}: shell syntax check BLOCKED: ${checked.error.message}`];
  return checked.status === 0 ? [] : [`${id}: shell syntax error: ${checked.stderr.trim()}`];
}

function commandLines(text) {
  const lines = [];
  let delimiter = null;
  for (const raw of text.replace(/\\\r?\n\s*/g, ' ').split('\n')) {
    if (delimiter !== null) {
      if (raw.trim() === delimiter) delimiter = null;
      continue;
    }
    lines.push(raw);
    const here = raw.match(/<<-?\s*['"]?([A-Za-z_]\w*)['"]?/);
    if (here) delimiter = here[1];
  }
  return lines;
}

// Preserve quoted arguments, including spaces in explicitly supplied paths. This is not
// an interpreter: Bash above owns syntax; this finite scanner owns the documented flags.
const SHELL_WORD = /"(?:\\.|[^"\\])*"|'[^']*'|[^\s;&|]+/g;
const unquote = (word) => /^(["'])[\s\S]*\1$/.test(word) ? word.slice(1, -1) : word;
export function commandFindings(id, text) {
  const errors = shellSyntaxFindings(id, text);
  for (const raw of commandLines(text)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const words = [...raw.matchAll(SHELL_WORD)].map((match) => unquote(match[0]));
    for (let index = 0; index < words.length; index++) {
      let verbAt;
      if (words[index] === 'truthsrc') verbAt = index + 1;
      else if (words[index] === 'node' && /(?:\btruthsrc\.(?:js|mjs)$|\$(?:\{)?(?:TRUTHSRC_CLI|CLI)(?:\})?$)/.test(words[index + 1] || '')) verbAt = index + 2;
      else continue;
      const verb = words[verbAt];
      if (!DECLARED_COMMANDS.has(verb)) {
        errors.push(`${id}: unknown or missing declared CLI command: ${verb || '(missing)'}`);
        continue;
      }
      if (!PROJECT_COMMANDS.has(verb)) continue;
      // Restrict each check to this invocation, never borrow flags from a later command.
      const start = [...raw.matchAll(SHELL_WORD)][index].index;
      const invocation = raw.slice(start).split(/\s*(?:&&|\|\||;)\s*/)[0];
      const args = [...invocation.matchAll(SHELL_WORD)].map((match) => unquote(match[0]));
      for (const flag of ['--project', '--out']) {
        const at = args.indexOf(flag);
        const equal = args.find((arg) => arg.startsWith(flag + '='));
        const value = equal ? unquote(equal.slice(flag.length + 1)) : at >= 0 ? args[at + 1] : undefined;
        if (!value || value.startsWith('-')) errors.push(`${id}: missing ${flag}`);
        if (flag === '--out' && value && /^(?:\.\/?|\.\/\.)$/.test(value)) errors.push(`${id}: output must not be the author root`);
      }
      if (invocation.includes('…') || /\s\.\.\.(?:\s|$)|--symbol\b/.test(invocation)) errors.push(`${id}: abbreviated or unsupported command`);
    }
  }
  return errors;
}

export function payloadFindings(id, sample) {
  const { text, attributes } = sample;
  const kind = attributes['data-example-kind'];
  // C's explicitly named IR example predates optional grammar attributes.
  const grammar = attributes['data-grammar'] || (id === 'counter-fold-ir' ? 'json' : undefined);
  const compiledFragment = kind === 'compiled-fragment' || id === 'counter-fold-ir';
  if (kind && !['shell', 'author', 'compiled-fragment', 'proposal', 'text'].includes(kind)) return [`${id}: unknown example kind ${kind}`];
  if (grammar && !['shell', 'bash', 'json', 'yaml', 'text'].includes(grammar)) return [`${id}: unknown example grammar ${grammar}`];
  // JSON grammar is checked only for explicitly marked compiled fragments, never a
  // whole author tree, arbitrary JSON-looking prose or proposed language semantics.
  if (grammar === 'json') {
    if (!compiledFragment) return [`${id}: JSON grammar requires a marked compiled-fragment`];
    try { JSON.parse(text); } catch (error) { return [`${id}: compiled fragment JSON syntax: ${error.message}`]; }
    return [];
  }
  const shell = kind === 'shell' || ['shell', 'bash'].includes(grammar) ||
    (!kind && !grammar && /^(?:\s*#.*\n)*\s*(?:export\s|node\s|truthsrc\s|:\s|git\s|cd\s|npm\s)/.test(text));
  return shell ? commandFindings(id, text) : [];
}

export function checkExamples(root = ROOT, bankRoot = null) {
  const errors = [], checked = [];
  const ids = new Set();
  for (const route of ROUTES) {
    let en, zh;
    try {
      en = extractExamples(readFileSync(resolve(root, route, 'index.html'), 'utf8'));
      zh = extractExamples(readFileSync(resolve(root, 'zh', route, 'index.html'), 'utf8'));
    } catch (error) { errors.push(`${route || '/'}: ${error.message}`); continue; }
    for (const id of new Set([...en.keys(), ...zh.keys()])) {
      const first = en.get(id), second = zh.get(id);
      if (!first || !second || first.text !== second.text) {
        errors.push(`${route || '/'}: EN/ZH payload differs for ${id}`);
        continue;
      }
      if (ids.has(id)) errors.push(`${id}: example ID reused on another page`);
      ids.add(id);
      errors.push(...payloadFindings(id, first));
      const hash = createHash('sha256').update(first.text).digest('hex');
      for (const sample of [first, second]) {
        if (sample.attributes['data-source-sha256'] && hash !== sample.attributes['data-source-sha256']) errors.push(`${id}: example bytes differ from the captured source fingerprint`);
        if (sample.attributes['data-source-file'] && !sample.attributes['data-source-sha256']) errors.push(`${id}: source fingerprint missing`);
      }
      for (const key of new Set([...Object.keys(first.attributes), ...Object.keys(second.attributes)])) {
        if (/^data-(?:source-|example-kind$|grammar$)/.test(key) && first.attributes[key] !== second.attributes[key]) errors.push(`${id}: EN/ZH ${key} differs`);
      }
      const sourceFile = first.attributes['data-source-file'];
      if (id === 'initialize-account-file' && (!sourceFile || !first.attributes['data-source-sha256'])) errors.push(`${id}: source fingerprint missing`);
      if (sourceFile !== second.attributes['data-source-file']) errors.push(`${id}: source references differ`);
      let sourceChecked = false;
      if (bankRoot && sourceFile) {
        try {
          const base = realpathSync(bankRoot), file = realpathSync(resolve(base, sourceFile));
          const local = relative(base, file);
          if (local === '..' || local.startsWith('../') || isAbsolute(local) || isAbsolute(sourceFile)) errors.push(`${id}: source path escapes bank root`);
          else {
            sourceChecked = true;
            if (readFileSync(file, 'utf8') !== first.text) errors.push(`${id}: supplied bank checkout differs from captured example`);
          }
        } catch (error) { errors.push(`${id}: cannot read supplied source: ${error.message}`); }
      }
      checked.push({ page: route || '/', id, bytes: Buffer.byteLength(first.text), sourceChecked });
    }
  }
  for (const id of BASELINE_IDS) if (!ids.has(id)) errors.push(`${id}: baseline example missing`);
  return { scope: 'Paired text, source bytes, marked grammar and shell syntax only; no CLI/compiler/semantic execution.', examples: checked, errors };
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
