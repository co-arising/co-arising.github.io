import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractExamples, commandFindings, checkExamples } from '../check-examples.mjs';

test('paired page examples are complete and source-bound', () => {
  const result = checkExamples();
  assert.deepEqual(result.errors, []);
  assert.equal(result.examples.length, 9);
});

test('only marked plain code is a runnable example payload', () => {
  const examples = extractExamples('<pre data-example="one"><code>left &lt; right &amp;&amp; "value"</code></pre><pre><code>unmarked</code></pre>');
  assert.equal(examples.size, 1);
  assert.equal(examples.get('one').text, 'left < right && "value"');
  assert.throws(() => extractExamples('<pre data-example="one"><code><span>not plain</span></code></pre>'), /plain escaped/);
  assert.throws(() => extractExamples('<pre data-example="one"><code>a</code></pre><pre data-example="one"><code>b</code></pre>'), /Duplicate/);
});

test('project commands require explicit config and disjoint output', () => {
  assert.equal(commandFindings('bad', 'node "$CLI" generate-project --plan').length, 2);
  assert.equal(commandFindings('indented', '  node "$CLI" generate-project --plan').length, 2);
  assert.ok(commandFindings('bad', 'truthsrc verify-project --project truthsrc.project.json --out .').some((message) => message.includes('author root')));
  assert.deepEqual(commandFindings('good', 'node "$CLI" generate-project \\\n  --project truthsrc.project.json --out generated --plan'), []);
  assert.deepEqual(commandFindings('init', 'node "$CLI" init counter-lab --format human'), []);
});
