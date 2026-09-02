import assert from 'node:assert/strict';
import test from 'node:test';
import { diffBehavior } from '../src/diff.js';
import type { CommandBehavior } from '../src/types.js';

const base: CommandBehavior = { type: 'command', name: 'help', exitCode: 0, signal: null, stdout: '--json\n', stderr: '' };

test('returns null for identical behavior', () => assert.equal(diffBehavior(base, { ...base }), null));

test('creates readable line diff', () => {
  const diff = diffBehavior(base, { ...base, stdout: '--format\n' });
  assert.match(diff?.changes[0]?.diff ?? '', /- --json/);
  assert.match(diff?.changes[0]?.diff ?? '', /\+ --format/);
});
