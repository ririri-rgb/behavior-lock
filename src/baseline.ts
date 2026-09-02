import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BaselineFile, CommandBehavior } from './types.js';

export const BASELINE_DIR = '.behavior-lock';
export const BASELINE_FILE = 'baseline.json';

function baselinePath(root: string): string { return path.join(root, BASELINE_DIR, BASELINE_FILE); }

export async function writeBaseline(checks: CommandBehavior[], root = process.cwd()): Promise<string> {
  const dir = path.join(root, BASELINE_DIR);
  const target = baselinePath(root);
  const temp = `${target}.tmp-${process.pid}`;
  await mkdir(dir, { recursive: true });
  const baseline: BaselineFile = { version: 1, checks };
  await writeFile(temp, `${JSON.stringify(baseline, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
  await rename(temp, target);
  return target;
}

export async function readBaseline(root = process.cwd()): Promise<BaselineFile> {
  let raw: string;
  try { raw = await readFile(baselinePath(root), 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`No baseline found. Run "behavior-lock record" first.`);
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Baseline is not valid JSON. Re-record it after reviewing the file.'); }
  if (typeof parsed !== 'object' || parsed === null || (parsed as {version?: unknown}).version !== 1 || !Array.isArray((parsed as {checks?: unknown}).checks)) {
    throw new Error('Unsupported or invalid baseline format.');
  }
  return parsed as BaselineFile;
}
