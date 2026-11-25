import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export const MAX_BYTES = 32 * 1024 * 1024;
export const HASH = /^[a-f0-9]{64}$/;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const jsonBytes = value => Buffer.from(JSON.stringify(stable(value)) + '\n');
export const text = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
export const safePath = value => typeof value === 'string' && value.length > 0 && value.length <= 8192 &&
  !/[\\\p{Cc}\p{Cf}?#:%]/u.test(value) && !value.startsWith('/') &&
  value.split('/').every(part => part && part !== '.' && part !== '..');
export const pointer = value => typeof value === 'string' && (value === '' || value.startsWith('/')) && !/~(?:[^01]|$)/u.test(value);
export const contains = (root, file) => { const r = relative(root, file); return r === '' || (!isAbsolute(r) && r !== '..' && !r.startsWith('..' + sep)); };
export const overlaps = (a, b) => contains(a, b) || contains(b, a);

// Check every component, not merely realpath containment. In particular, reject
// dangling links, lexical traversal, case aliases and multiply-linked files.
export function plainPath(file, { missing = false, directory = false } = {}) {
  assert.ok(typeof file === 'string' && isAbsolute(file) && !/[\p{Cc}\p{Cf}]/u.test(file), 'absolute plain path required');
  const root = parse(file).root, parts = file.slice(root.length).split(sep);
  assert.ok(parts.every(p => p && p !== '.' && p !== '..'), 'path traversal/noncanonical path');
  let current = root, absent = false;
  for (const part of parts) {
    current = join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; absent = true; continue; }
    assert.ok(!absent && !stat.isSymbolicLink(), 'symlink path forbidden');
    const aliases = readdirSync(dirname(current)).filter(p => p.normalize('NFC').toLowerCase() === part.normalize('NFC').toLowerCase());
    assert.deepEqual(aliases, [part], 'case-fold path alias');
    if (current !== file) assert.ok(stat.isDirectory(), 'non-directory path component');
  }
  if (absent) { assert.ok(missing, 'path does not exist'); return resolve(file); }
  const stat = lstatSync(file);
  assert.ok(directory ? stat.isDirectory() : stat.isFile() && stat.nlink === 1, 'plain single-linked file/directory required');
  return resolve(file);
}
export function readPlain(file) {
  plainPath(file);
  assert.ok(lstatSync(file).size <= MAX_BYTES, 'input exceeds resource limit');
  return readFileSync(file);
}
export function repoRoot(project) {
  let dir = dirname(project);
  for (;;) {
    try { lstatSync(join(dir, '.git')); return dir; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (dirname(dir) === dir) return dirname(project); // documented init projects need not be Git repos
    dir = dirname(dir);
  }
}
export function assertDestination(dest, roots) {
  plainPath(dest, { missing: true });
  assert.throws(() => lstatSync(dest), { code: 'ENOENT' }, 'destination must not exist');
  plainPath(dirname(dest), { directory: true });
  assert.ok(roots.every(root => !overlaps(dest, root)), 'destination overlaps a source, output, tool or bank root');
}

const secretKey = /^(?:(?:[\w-]+\.)*secret\.key|password|passwd|passphrase|secret|secret[-_]?value|client[-_]?secret|api[-_]?key|private[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|token|authorization|credential[s]?)$/i;
const placeholder = value => /^(?:\$\{\??[A-Za-z_][A-Za-z_0-9.-]*\}|\$[A-Z_][A-Z_0-9]*|process\.env\.[A-Z_][A-Z_0-9]*|<[^>]+>)$/.test(value);
export function sensitiveReason(value, roots = [], { sourcePath = '' } = {}) {
  const scanText = input => {
    const s = input.replaceAll('\\/', '/');
    if (/(?:-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}|\bsk-(?:live-|proj-)?[A-Za-z0-9_-]{20,})/.test(s)) return 'private-key-or-token';
    if (/(?:file:\/\/|\b[A-Za-z]:[\\/]|\/(?:Users|home|private|Volumes|root|workspace|workspaces|mnt|opt|srv)\/|\/var\/(?:folders|home)\/|\/tmp\/)/i.test(s) ||
      roots.some(root => root && s.includes(root))) return 'local-absolute-path';
    if (/(?:javascript\s*:|data\s*:\s*text\/html|https?:\/\/[^\s/]+:[^\s/@]+@)/i.test(s)) return 'unsafe-url';
    // Scan source/config assignments without changing even one byte. References
    // to environment variables are not secret values; literal defaults are.
    const assignments = /["']?\b((?:[\w-]+\.)*secret\.key|password|passwd|passphrase|secret|secret[-_]?value|client[-_]?secret|api[-_]?key|private[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|token|authorization|credentials?)["']?\s*[:=]\s*(?:["']([^"'\r\n]*)["']|([^\s,;}\r\n]+))/gi;
    for (const match of s.matchAll(assignments)) {
      const v = (match[2] ?? match[3] ?? '').trim();
      const suffix = s.slice(match.index);
      if (sourcePath.endsWith('.scala')) {
        if (/^'Authorization':\s*'Bearer '\s*\+\s*[\w.]+/.test(suffix)) continue;
        if (/^credentials:\s*'(?:omit|same-origin|include)'/.test(suffix)) continue;
      }
      if (sourcePath.endsWith('.scala') && match[2] === undefined) {
        // Scala type annotations and identifier expressions carry no literal secret.
        // Equality tests are not assignments. Quoted/default literals still fail.
        if (/^["']?[\w.-]+["']?\s*(?::\s*[A-Z][\w.]*(?:\[[\w.\[\], ]+\])?\s*(?=[,)};\r\n]|$)|==|=>)/.test(suffix)) continue;
        if (/^["']?[\w.-]+["']?\s*=\s*[A-Za-z_][\w.]*\s*(?=[,);\r\n]|$)/.test(suffix)) continue;
        if (/^["']?[\w.-]+["']?\s*=\s*[\w.]+\.nextToken\(\)/.test(suffix)) continue;
        if (/^["']?[\w.-]+["']?\s*=\s*[\w.]+\.getString\("[A-Za-z0-9_.-]+"\)(?:\.trim)?/.test(suffix)) continue;
        if (/^credentials\s*=\s*\w+\s*(?:<|>|<=|>=)\s*\d+\s*(?:\|\||&&)/.test(suffix)) continue;
      }
      if (sourcePath.endsWith('.proto') && match[2] === undefined && /^["']?[\w.-]+["']?\s*=\s*\d+\s*;/.test(suffix)) continue;
      if (v && !placeholder(v) && !/^(?:null|undefined|false|\$\{\??[A-Za-z_][A-Za-z_0-9.-]*\}?)$/.test(v)) return 'secret-value';
    }
    // Some carriers contain serialized JSON, including escaped key names.
    if (/^\s*[\[{]/.test(s)) { try { return visit(JSON.parse(s)); } catch { /* ordinary source text */ } }
    return null;
  };
  const visit = input => {
    if (typeof input === 'string') return scanText(input);
    if (input && typeof input === 'object') for (const [key, child] of Object.entries(input)) {
      if (secretKey.test(key) && child !== null && child !== '' && child !== false &&
        !(typeof child === 'string' && placeholder(child))) return 'secret-value';
      const found = scanText(key) || visit(child); if (found) return found;
    }
    return null;
  };
  return visit(value);
}
export function assertPublic(value, roots = [], options = {}) {
  assert.equal(sensitiveReason(value, roots, options), null, 'public payload contains sensitive data');
}
export function verifyBuffer(bytes, descriptor) {
  assert.ok(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, 'captured byte buffer required');
  assert.ok(Number.isSafeInteger(descriptor.bytes) && descriptor.bytes >= 0 && descriptor.bytes <= MAX_BYTES &&
    HASH.test(descriptor.sha256) && bytes.length === descriptor.bytes && sha256(bytes) === descriptor.sha256, 'file byte/hash mismatch');
  text(bytes); // all published/withheld sources are UTF-8, never binary masquerading as text
}
export function verifySpan(bytes, span) {
  assert.ok(span && Number.isSafeInteger(span.start) && Number.isSafeInteger(span.end) &&
    span.start >= 0 && span.end > span.start && span.end <= bytes.length, 'invalid byte span');
  text(bytes.subarray(0, span.start)); text(bytes.subarray(span.start, span.end));
  if (Object.hasOwn(span, 'text')) assert.ok(typeof span.text === 'string' &&
    Buffer.from(bytes.subarray(span.start, span.end)).equals(Buffer.from(span.text)), 'span text mismatch');
}
