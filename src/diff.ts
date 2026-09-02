import type { BehaviorSnapshot, CheckDiff, CommandBehavior, FieldChange, JsonCommandBehavior } from './types.js';

const MAX_DIFF_CELLS = 250_000;
const MAX_DIFF_LINES = 200;

function boundedSummary(a: string[], b: string[]): string {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  while (aEnd >= start && bEnd >= start && a[aEnd] === b[bEnd]) { aEnd--; bEnd--; }
  const removed = a.slice(start, aEnd + 1);
  const added = b.slice(start, bEnd + 1);
  const lines = [
    `... diff summarized safely (${a.length} → ${b.length} lines) ...`,
    ...removed.slice(0, 40).map((line) => `- ${line}`),
    ...added.slice(0, 40).map((line) => `+ ${line}`)
  ];
  if (removed.length > 40 || added.length > 40) lines.push(`... ${Math.max(0, removed.length - 40)} more removed, ${Math.max(0, added.length - 40)} more added lines omitted ...`);
  return lines.join('\n');
}

export function lineDiff(before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > MAX_DIFF_CELLS) return boundedSummary(a, b);
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    const row = dp[i]!;
    const next = dp[i + 1]!;
    for (let j = b.length - 1; j >= 0; j--) row[j] = a[i] === b[j] ? next[j + 1]! + 1 : Math.max(next[j]!, row[j + 1]!);
  }
  const out: string[] = [];
  let i = 0; let j = 0;
  while ((i < a.length || j < b.length) && out.length < MAX_DIFF_LINES) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; continue; }
    if (j < b.length && (i === a.length || dp[i]![j + 1]! > dp[i + 1]![j]!)) { out.push(`+ ${b[j]}`); j++; }
    else if (i < a.length) { out.push(`- ${a[i]}`); i++; }
  }
  if (i < a.length || j < b.length) out.push('... diff truncated ...');
  return out.join('\n');
}

function jsonChanges(before: unknown, after: unknown, path = '$', out: FieldChange[] = []): FieldChange[] {
  if (Object.is(before, after)) return out;
  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) jsonChanges(before[i], after[i], `${path}[${i}]`, out);
    return out;
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const a = before as Record<string, unknown>; const b = after as Record<string, unknown>;
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) jsonChanges(a[key], b[key], `${path}.${key}`, out);
    return out;
  }
  out.push({ field: 'json', path, before, after });
  return out;
}

function commonChanges(before: BehaviorSnapshot, after: BehaviorSnapshot): FieldChange[] {
  const changes: FieldChange[] = [];
  if (before.exitCode !== after.exitCode) changes.push({ field: 'exitCode', before: before.exitCode, after: after.exitCode });
  if (before.signal !== after.signal) changes.push({ field: 'signal', before: before.signal, after: after.signal });
  return changes;
}

export function diffBehavior(before: BehaviorSnapshot, after: BehaviorSnapshot): CheckDiff | null {
  const changes = commonChanges(before, after);
  if (before.type !== after.type) changes.push({ field: 'type', before: before.type, after: after.type });
  else if (before.type === 'command' && after.type === 'command') {
    const a = before as CommandBehavior; const b = after as CommandBehavior;
    if (a.stdout !== b.stdout) changes.push({ field: 'stdout', before: a.stdout, after: b.stdout, diff: lineDiff(a.stdout, b.stdout) });
    if (a.stderr !== b.stderr) changes.push({ field: 'stderr', before: a.stderr, after: b.stderr, diff: lineDiff(a.stderr, b.stderr) });
  } else if (before.type === 'json-command' && after.type === 'json-command') {
    const a = before as JsonCommandBehavior; const b = after as JsonCommandBehavior;
    jsonChanges(a.json, b.json, '$', changes);
    if (a.stderr !== b.stderr) changes.push({ field: 'stderr', before: a.stderr, after: b.stderr, diff: lineDiff(a.stderr, b.stderr) });
  }
  return changes.length === 0 ? null : { name: before.name, changes };
}
