import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE, writeConfig } from './config.js';

async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch { return false; } }

export interface InitSuggestion {
  name: string;
  command: string;
  args: string[];
  reason: string;
}

export interface InitResult {
  found: string[];
  suggestions: InitSuggestion[];
  created: boolean;
  alreadyConfigured: boolean;
  notes: string[];
}

export async function initRepository(root = process.cwd()): Promise<InitResult> {
  const metadata = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'Makefile'];
  const found: string[] = [];
  for (const file of metadata) if (await exists(path.join(root, file))) found.push(file);

  const suggestions: InitSuggestion[] = [];
  const notes: string[] = [];
  const configPath = path.join(root, CONFIG_FILE);
  const alreadyConfigured = await exists(configPath);

  if (found.includes('package.json')) {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      bin?: string | Record<string, string>;
      scripts?: Record<string, string>;
    };
    const entries = typeof pkg.bin === 'string' ? [['cli', pkg.bin] as const] : Object.entries(pkg.bin ?? {});
    if (pkg.scripts?.build) notes.push('Found build command: npm run build');
    if (pkg.scripts?.test) notes.push('Found test command: npm test');

    const first = entries[0];
    if (first) {
      const [name, entry] = first;
      if (await exists(path.resolve(root, entry))) {
        suggestions.push(
          { name: `${name}-help`, command: 'node', args: [entry, '--help'], reason: 'Detected a runnable Node CLI entry; --help is a conventional candidate, not assumed support.' },
          { name: `${name}-version`, command: 'node', args: [entry, '--version'], reason: 'Detected a runnable Node CLI entry; --version is a conventional candidate, not assumed support.' }
        );
      } else notes.push(`Detected CLI entry ${entry}, but it does not exist yet. Build the project before capturing it.`);
    }
  }

  let created = false;
  if (!alreadyConfigured) {
    await writeConfig({ version: 1, checks: [] }, root);
    created = true;
  } else notes.push(`${CONFIG_FILE} already exists; left it unchanged.`);

  return { found, suggestions, created, alreadyConfigured, notes };
}
