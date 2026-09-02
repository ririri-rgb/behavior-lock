import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckExecutionError, runCommandCheck } from '../src/runner.js';

test('captures exit code stdout and stderr without a shell', async () => {
  const result = await runCommandCheck({ type: 'command', name: 'capture', command: process.execPath, args: ['-e', "process.stdout.write('out');process.stderr.write('err');process.exit(3)"] });
  assert.deepEqual({ exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr }, { exitCode: 3, stdout: 'out', stderr: 'err' });
});

test('enforces output limits', async () => {
  await assert.rejects(runCommandCheck({ type: 'command', name: 'large', command: process.execPath, args: ['-e', "process.stdout.write('x'.repeat(1000))"], maxOutputBytes: 100 }), CheckExecutionError);
});
