import { readBaseline, writeBaseline } from './baseline.js';
import { loadConfig } from './config.js';
import { diffBehavior } from './diff.js';
import { runCommandCheck } from './runner.js';
import type { CheckDiff, CommandBehavior } from './types.js';

async function capture(root: string): Promise<CommandBehavior[]> {
  const config = await loadConfig(root);
  const results: CommandBehavior[] = [];
  for (const check of config.checks) results.push(await runCommandCheck(check, root));
  return results;
}

export async function record(root = process.cwd()): Promise<{ path: string; count: number }> {
  const checks = await capture(root);
  return { path: await writeBaseline(checks, root), count: checks.length };
}

export async function verify(root = process.cwd()): Promise<{ diffs: CheckDiff[]; unchanged: number }> {
  const baseline = await readBaseline(root);
  const current = await capture(root);
  const baselineByName = new Map(baseline.checks.map((check) => [check.name, check]));
  const currentByName = new Map(current.map((check) => [check.name, check]));
  const diffs: CheckDiff[] = [];
  let unchanged = 0;

  for (const currentCheck of current) {
    const before = baselineByName.get(currentCheck.name);
    if (!before) {
      diffs.push({ name: currentCheck.name, changes: [{ field: 'stdout', before: '<missing from baseline>', after: '<new check>' }] });
      continue;
    }
    const diff = diffBehavior(before, currentCheck);
    if (diff) diffs.push(diff); else unchanged++;
  }
  for (const before of baseline.checks) {
    if (!currentByName.has(before.name)) diffs.push({ name: before.name, changes: [{ field: 'stdout', before: '<baseline check>', after: '<removed from config>' }] });
  }
  return { diffs, unchanged };
}
