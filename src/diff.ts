import type { CheckDiff, CommandBehavior, FieldChange } from './types.js';

function lineDiff(before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint32Array(cols));
  for (let i = a.length - 1; i >= 0; i--) {
    const row = dp[i]!;
    const next = dp[i + 1]!;
    for (let j = b.length - 1; j >= 0; j--) row[j] = a[i] === b[j] ? next[j + 1]! + 1 : Math.max(next[j]!, row[j + 1]!);
  }
  const out: string[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; continue; }
    if (j < b.length && (i === a.length || dp[i]![j + 1]! > dp[i + 1]![j]!)) { out.push(`+ ${b[j]}`); j++; }
    else if (i < a.length) { out.push(`- ${a[i]}`); i++; }
  }
  return out.join('\n');
}

export function diffBehavior(before: CommandBehavior, after: CommandBehavior): CheckDiff | null {
  const changes: FieldChange[] = [];
  if (before.exitCode !== after.exitCode) changes.push({ field: 'exitCode', before: before.exitCode, after: after.exitCode });
  if (before.signal !== after.signal) changes.push({ field: 'signal', before: before.signal, after: after.signal });
  if (before.stdout !== after.stdout) changes.push({ field: 'stdout', before: before.stdout, after: after.stdout, diff: lineDiff(before.stdout, after.stdout) });
  if (before.stderr !== after.stderr) changes.push({ field: 'stderr', before: before.stderr, after: after.stderr, diff: lineDiff(before.stderr, after.stderr) });
  return changes.length === 0 ? null : { name: before.name, changes };
}
