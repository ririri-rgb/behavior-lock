import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readBaseline, writeBaseline } from '../src/baseline.js';

const behavior = { type: 'command' as const, name: 'x', exitCode: 0, signal: null, stdout: 'ok\n', stderr: '' };

test('writes deterministic human-readable baseline without timestamps', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-'));
  const target = await writeBaseline([behavior], root);
  const raw = await readFile(target, 'utf8');
  assert.match(raw, /"name": "x"/);
  assert.doesNotMatch(raw, /createdAt|timestamp/i);
  assert.deepEqual(await readBaseline(root), { version: 1, checks: [behavior] });
});
