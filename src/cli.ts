#!/usr/bin/env node
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { record, verify } from './core.js';
import { reportDiffs } from './reporter.js';

export const EXIT = { OK: 0, CHANGED: 1, ERROR: 2 } as const;

const HELP = `behavior-lock v0.1.0\n\nLock your software's behavior before AI touches the code.\n\nUsage:\n  behavior-lock record\n  behavior-lock verify\n  behavior-lock --help\n  behavior-lock --version\n\nExit codes:\n  0  behavior unchanged / record succeeded\n  1  behavioral changes detected\n  2  configuration or execution error\n`;

export async function main(argv = process.argv.slice(2), root = process.cwd()): Promise<number> {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) { process.stdout.write(HELP); return EXIT.OK; }
  if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-v')) { process.stdout.write('0.1.0\n'); return EXIT.OK; }
  if (argv.length !== 1 || !['record', 'verify'].includes(argv[0]!)) {
    process.stderr.write('Usage: behavior-lock <record|verify>\nRun "behavior-lock --help" for details.\n');
    return EXIT.ERROR;
  }
  try {
    if (argv[0] === 'record') {
      const result = await record(root);
      process.stdout.write(`Behavior Lock\n\n✓ Recorded ${result.count} behavior${result.count === 1 ? '' : 's'}\nBaseline: ${relative(root, result.path)}\n`);
      return EXIT.OK;
    }
    const result = await verify(root);
    process.stdout.write(`${reportDiffs(result.diffs, result.unchanged)}\n`);
    return result.diffs.length === 0 ? EXIT.OK : EXIT.CHANGED;
  } catch (error) {
    process.stderr.write(`Behavior Lock error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT.ERROR;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
