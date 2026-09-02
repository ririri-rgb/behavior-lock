import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { main, EXIT } from '../src/cli.js';
import { diffBehavior, lineDiff } from '../src/diff.js';
import type { JsonCommandBehavior } from '../src/types.js';

test('large line diffs use bounded summary instead of quadratic matrix', () => {
  const before = Array.from({ length: 20_000 }, (_, i) => `before-${i}`).join('\n');
  const after = Array.from({ length: 20_000 }, (_, i) => `after-${i}`).join('\n');
  const diff = lineDiff(before, after);
  assert.match(diff, /diff summarized safely/);
  assert.ok(diff.split('\n').length < 100);
});

test('json behavior reports path-level changes', () => {
  const before: JsonCommandBehavior = { type: 'json-command', name: 'users', exitCode: 0, signal: null, json: { users: [{ name: 'Alice', active: true }] }, stderr: '' };
  const after: JsonCommandBehavior = { ...before, json: { users: [{ name: 'Alicia', active: false }] } };
  const diff = diffBehavior(before, after);
  assert.deepEqual(diff?.changes.map((change) => change.path), ['$.users[0].active', '$.users[0].name']);
});

test('one-command capture writes config and verifies unchanged', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-one-'));
  const app = path.join(root, 'app.mjs');
  await writeFile(app, "console.log('hello')\n");
  assert.equal(await main(['record', '--name', 'hello', '--', process.execPath, 'app.mjs'], root), EXIT.OK);
  const config = await readFile(path.join(root, 'behavior-lock.json'), 'utf8');
  assert.match(config, /\"hello\"/);
  assert.equal(await main(['verify', '--json'], root), EXIT.OK);
});
