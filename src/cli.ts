#!/usr/bin/env node
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initRepository } from './init.js';
import { record, recordOne, verify } from './core.js';
import { reportDiffs } from './reporter.js';
import type { CheckConfig } from './types.js';

export const EXIT = { OK: 0, CHANGED: 1, ERROR: 2 } as const;
const VERSION = '0.2.0';
const HELP = `behavior-lock v${VERSION}\n\nLock your software's behavior before AI touches the code.\n\nUsage:\n  behavior-lock init\n  behavior-lock record\n  behavior-lock record --name <name> -- <command> [args...]\n  behavior-lock record --json --name <name> -- <command> [args...]\n  behavior-lock verify [--json]\n  behavior-lock --help\n  behavior-lock --version\n\nExit codes:\n  0  behavior unchanged / record succeeded\n  1  behavioral changes detected\n  2  configuration or execution error\n`;

function oneShot(argv: string[]): CheckConfig | null {
  if (argv[0] !== 'record') return null;
  const separator = argv.indexOf('--');
  if (separator < 0) return null;
  const before = argv.slice(1, separator); const command = argv[separator + 1];
  const nameIndex = before.indexOf('--name');
  if (nameIndex < 0 || !before[nameIndex + 1] || !command) throw new Error('One-command capture requires --name <name> -- <command> [args...]');
  const json = before.includes('--json');
  const allowed = new Set(['--name', before[nameIndex + 1]!, ...(json ? ['--json'] : [])]);
  if (before.some((arg) => !allowed.has(arg))) throw new Error('Unknown record option');
  return { type: json ? 'json-command' : 'command', name: before[nameIndex + 1]!, command, args: argv.slice(separator + 2) } as CheckConfig;
}

export async function main(argv = process.argv.slice(2), root = process.cwd()): Promise<number> {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) { process.stdout.write(HELP); return EXIT.OK; }
  if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-v')) { process.stdout.write(`${VERSION}\n`); return EXIT.OK; }
  try {
    if (argv.length === 1 && argv[0] === 'init') {
      const result = await initRepository(root);
      const lines = ['Behavior Lock', '', 'Analyzing repository...', ''];
      for (const file of result.found) lines.push(`✓ Found ${file}`);
      for (const note of result.notes) lines.push(`✓ ${note}`);
      if (result.created) lines.push('', 'Created behavior-lock.json');
      if (result.suggestions.length > 0) {
        lines.push('', 'Suggested captures (review before running):');
        for (const suggestion of result.suggestions) {
          const args = suggestion.args.map((arg) => JSON.stringify(arg)).join(' ');
          lines.push(`  behavior-lock record --name ${suggestion.name} -- ${suggestion.command} ${args}`, `    ${suggestion.reason}`);
        }
      }
      lines.push('', 'Next:', result.suggestions.length > 0 ? '  Run one suggested capture, or add your own.' : '  behavior-lock record --name cli-help -- <your-cli> --help');
      process.stdout.write(`${lines.join('\n')}\n`); return EXIT.OK;
    }
    const single = oneShot(argv);
    if (single) {
      const result = await recordOne(single, root);
      process.stdout.write(`Behavior Lock\n\n✓ Recorded ${single.name}\nBaseline: ${relative(root, result.path)}\nRegistered in behavior-lock.json\n`); return EXIT.OK;
    }
    if (argv.length === 1 && argv[0] === 'record') {
      const result = await record(root);
      process.stdout.write(`Behavior Lock\n\n✓ Recorded ${result.count} behavior${result.count === 1 ? '' : 's'}\nBaseline: ${relative(root, result.path)}\n`); return EXIT.OK;
    }
    if (argv[0] === 'verify' && (argv.length === 1 || (argv.length === 2 && argv[1] === '--json'))) {
      const result = await verify(root);
      if (argv[1] === '--json') process.stdout.write(`${JSON.stringify(result)}\n`);
      else process.stdout.write(`${reportDiffs(result.checks, result.unchanged)}\n`);
      return result.changed === 0 ? EXIT.OK : EXIT.CHANGED;
    }
    process.stderr.write('Usage: behavior-lock <init|record|verify>\nRun "behavior-lock --help" for details.\n'); return EXIT.ERROR;
  } catch (error) {
    process.stderr.write(`Behavior Lock error: ${error instanceof Error ? error.message : String(error)}\n`); return EXIT.ERROR;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
