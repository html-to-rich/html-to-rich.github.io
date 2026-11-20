import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareRichText, MAX_BYTES, MAX_DEPTH} from '../converter-core.mjs';
import {examples} from './fixtures.mjs';

for (const [name, source, plain] of examples) {
  test(name, () => {
    const result = prepareRichText(source);
    assert.equal(result.ok, true);
    assert.equal(result.plainText, plain);
    assert.equal(result.sanitizationChanged, source !== result.html);
    assert.equal(prepareRichText(result.html).sanitizationChanged, false);
    assert.equal(prepareRichText(result.html).plainText, plain);
  });
}

test('rich output can be enclosed in a Markdown code fence', () => {
  assert.ok(!prepareRichText(examples[0][1]).html.includes('```'));
});
test('no partial content returned on profile rejection, next valid request succeeds', () => {
  for (const [source, code] of [
    ['<p>unfinished', 'MALFORMED_HTML'],
    ['<p>A<div>B</div></p>', 'REPAIRED_STRUCTURE'],
    ['<p><a href="about:blank">label</a></p>', 'UNSAFE_URL'],
    ['<p>draft<img src="https://example.invalid/image"></p>', 'UNSAFE_ELEMENT'],
    ['<p align="right">keep alignment</p>', 'UNSUPPORTED_ATTRIBUTE'],
    ['<p>\ud800</p>', 'INVALID_UNICODE'],
    ['<p>' + 'ø'.repeat(MAX_BYTES / 2) + '</p>', 'TOO_LARGE'],
    ['<div>'.repeat(MAX_DEPTH + 1) + 'X' + '</div>'.repeat(MAX_DEPTH + 1), 'TOO_DEEP']
  ]) {
    const result = prepareRichText(source);
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics[0].code, code);
    assert.equal(result.html, '');
    assert.equal(result.plainText, '');
    assert.equal(prepareRichText('<p>Ready</p>').plainText, 'Ready');
  }
});

test('literal code preserves br and refuses structures that cannot be serialized literally', () => {
  assert.equal(prepareRichText('<pre><code>A<br>B<br></code></pre>').plainText, 'A\nB\n');
  assert.equal(prepareRichText('<pre><p>A</p><p>B</p></pre>').diagnostics[0].code, 'CODE_STRUCTURE');
});
