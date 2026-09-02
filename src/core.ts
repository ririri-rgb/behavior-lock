import { readBaseline, writeBaseline } from './baseline.js';
import { loadConfig, upsertCheck } from './config.js';
import { diffBehavior } from './diff.js';
import { runCheck } from './runner.js';
import type { BehaviorSnapshot, CheckConfig, CheckDiff, VerifyResult } from './types.js';

async function capture(root: string): Promise<BehaviorSnapshot[]> {
  const config = await loadConfig(root);
  const results: BehaviorSnapshot[] = [];
  for (const check of config.checks) results.push(await runCheck(check, root));
  return results;
}

export async function record(root = process.cwd()): Promise<{ path: string; count: number }> {
  const checks = await capture(root);
  return { path: await writeBaseline(checks, root), count: checks.length };
}

export async function recordOne(check: CheckConfig, root = process.cwd()): Promise<{ path: string }> {
  const snapshot = await runCheck(check, root);
  let existing: BehaviorSnapshot[] = [];
  try { existing = (await readBaseline(root)).checks; } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('No baseline found')) throw error;
  }
  const index = existing.findIndex((entry) => entry.name === check.name);
  if (index >= 0) existing[index] = snapshot; else existing.push(snapshot);
  await upsertCheck(check, root);
  return { path: await writeBaseline(existing, root) };
}

export async function verify(root = process.cwd()): Promise<VerifyResult> {
  const baseline = await readBaseline(root); const current = await capture(root);
  const baselineByName = new Map(baseline.checks.map((check) => [check.name, check]));
  const currentByName = new Map(current.map((check) => [check.name, check]));
  const diffs: CheckDiff[] = []; let unchanged = 0;
  for (const currentCheck of current) {
    const before = baselineByName.get(currentCheck.name);
    if (!before) { diffs.push({ name: currentCheck.name, changes: [{ field: 'check', before: '<missing from baseline>', after: '<new check>' }] }); continue; }
    const diff = diffBehavior(before, currentCheck);
    if (diff) diffs.push(diff); else unchanged++;
  }
  for (const before of baseline.checks) if (!currentByName.has(before.name)) diffs.push({ name: before.name, changes: [{ field: 'check', before: '<baseline check>', after: '<removed from config>' }] });
  return { status: diffs.length ? 'changed' : 'unchanged', unchanged, changed: diffs.length, checks: diffs };
}
