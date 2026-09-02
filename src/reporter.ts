import type { CheckDiff } from './types.js';

export function reportDiffs(diffs: CheckDiff[], unchanged: number): string {
  const lines = ['Behavior Lock', ''];
  if (unchanged > 0) lines.push(`✓ ${unchanged} behavior${unchanged === 1 ? '' : 's'} unchanged`);
  if (diffs.length > 0) {
    if (unchanged > 0) lines.push('');
    lines.push(`✗ ${diffs.length} behavioral change${diffs.length === 1 ? '' : 's'} detected`, '');
    for (const diff of diffs) {
      lines.push(`✗ ${diff.name}`);
      for (const change of diff.changes) {
        if (change.path) lines.push('', change.path, `- ${JSON.stringify(change.before)}`, `+ ${JSON.stringify(change.after)}`);
        else if (change.diff !== undefined) lines.push('', `${change.field} changed:`, '', change.diff);
        else lines.push(`  ${change.field}: ${String(change.before)} → ${String(change.after)}`);
      }
      lines.push('');
    }
    lines.push('Result: FAILED');
  } else lines.push('', 'Result: PASSED');
  return lines.join('\n');
}
