import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = new URL('.', import.meta.url);
const root = await mkdtemp(path.join(os.tmpdir(), 'behavior-lock-example-'));
await cp(source, root, { recursive: true });
const cli = path.resolve('dist/cli.js');
const run = (command) => spawnSync(process.execPath, [cli, command], { cwd: root, encoding: 'utf8' });
console.log(run('record').stdout.trim());
console.log('\n--- unchanged ---');
console.log(run('verify').stdout.trim());
const app = path.join(root, 'app.mjs');
await writeFile(app, (await readFile(app, 'utf8')).replace('hello', 'HELLO'));
console.log('\n--- changed ---');
console.log(run('verify').stdout.trim());
