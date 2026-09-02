import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeText } from '../src/normalize.js';

test('normalizes line endings and masks dynamic values', () => {
  const value = 'id=abc123\r\nnext\r\n';
  assert.equal(normalizeText(value, { replacements: [{ pattern: 'id=[a-z0-9]+', replacement: 'id=<ignored>' }] }), 'id=<ignored>\nnext\n');
});
