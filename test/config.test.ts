import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

async function temp(): Promise<string> { return await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-')); }

test('loads a valid command config', async () => {
  const root = await temp();
  await writeFile(path.join(root, 'behavior-lock.json'), JSON.stringify({ version: 1, checks: [{ type: 'command', name: 'version', command: 'node', args: ['--version'] }] }));
  const config = await loadConfig(root);
  assert.equal(config.checks[0]?.name, 'version');
});

test('rejects duplicate check names', async () => {
  const root = await temp();
  await writeFile(path.join(root, 'behavior-lock.json'), JSON.stringify({ version: 1, checks: [{ type: 'command', name: 'x', command: 'node' }, { type: 'command', name: 'x', command: 'node' }] }));
  await assert.rejects(loadConfig(root), /duplicate check name/);
});
