import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sanitizeHistoricalWorkshop } from '../sanitize-historical-workshop.mjs';
const root = new URL('../../', import.meta.url).pathname;
const extract = text => JSON.parse(text.match(/<script id="workshop-view" type="application\/json">([\s\S]*?)<\/script>/)[1]);
test('public historical copy changes only two local path fields and keeps executable CSP', () => {
  const original = execFileSync('git', ['-C', root, 'show', '1906c3b1bff95250a24122eed6c49cd7ee1d4bb1'], { maxBuffer: 8 * 1024 * 1024 });
  const expected = sanitizeHistoricalWorkshop(original);
  const actual = readFileSync(new URL('../../downloads/bank-workshop.html', import.meta.url));
  assert.deepEqual(actual, expected);
  const before = extract(original.toString()), after = extract(actual.toString());
  assert.equal(after.verification.project, '[local path withheld in public copy]');
  assert.equal(after.verification.output, '[local path withheld in public copy]');
  after.verification.project = before.verification.project; after.verification.output = before.verification.output;
  assert.deepEqual(after, before);
  assert.doesNotMatch(actual.toString(), /\/Users\//);
  const script = actual.toString().match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(script).digest('base64');
  assert.ok(actual.toString().includes('sha256-' + hash));
});
test('historical sanitizer rejects a different baseline instead of guessing', () => {
  assert.throws(() => sanitizeHistoricalWorkshop(Buffer.from('other history')), /unexpected historical input/);
});
