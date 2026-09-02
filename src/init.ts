import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { writeConfig } from './config.js';
import type { BehaviorLockConfig, CheckConfig } from './types.js';

async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch { return false; } }

export interface InitResult { found: string[]; checks: CheckConfig[]; created: boolean; notes: string[]; }

export async function initRepository(root = process.cwd()): Promise<InitResult> {
  const metadata = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'Makefile'];
  const found: string[] = [];
  for (const file of metadata) if (await exists(path.join(root, file))) found.push(file);
  const checks: CheckConfig[] = []; const notes: string[] = [];
  if (found.includes('package.json')) {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as { bin?: string | Record<string, string>; scripts?: Record<string,string> };
    const entries = typeof pkg.bin === 'string' ? [['cli', pkg.bin] as const] : Object.entries(pkg.bin ?? {});
    if (pkg.scripts?.build) notes.push(`Found build command: npm run build`);
    if (pkg.scripts?.test) notes.push(`Found test command: npm test`);
    const first = entries[0];
    if (first) {
      const [name, entry] = first;
      if (await exists(path.resolve(root, entry))) {
        checks.push({ type: 'command', name: `${name}-help`, command: 'node', args: [entry, '--help'] });
        checks.push({ type: 'command', name: `${name}-version`, command: 'node', args: [entry, '--version'] });
      } else notes.push(`Detected CLI entry ${entry}, but it does not exist yet. Build the project, then run behavior-lock init again.`);
    }
  }
  if (checks.length) {
    const config: BehaviorLockConfig = { version: 1, checks };
    await writeConfig(config, root);
  }
  return { found, checks, created: checks.length > 0, notes };
}
