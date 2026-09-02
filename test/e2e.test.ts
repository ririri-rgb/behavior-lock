import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { main, EXIT } from '../src/cli.js';

async function fixture(): Promise<{root: string; target: string}> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-e2e-'));
  const target = path.join(root, 'app.mjs');
  await writeFile(target, "console.log('hello')\n");
  await writeFile(path.join(root, 'behavior-lock.json'), JSON.stringify({ version: 1, checks: [{ type: 'command', name: 'app', command: process.execPath, args: ['app.mjs'] }] }, null, 2));
  return { root, target };
}

test('record then verify unchanged succeeds, changed behavior fails', async () => {
  const { root, target } = await fixture();
  assert.equal(await main(['record'], root), EXIT.OK);
  assert.equal(await main(['verify'], root), EXIT.OK);
  await writeFile(target, "console.log('goodbye')\n");
  assert.equal(await main(['verify'], root), EXIT.CHANGED);
});

test('configuration error exits 2', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-e2e-'));
  assert.equal(await main(['verify'], root), EXIT.ERROR);
});
