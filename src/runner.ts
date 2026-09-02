import { spawn } from 'node:child_process';
import path from 'node:path';
import type { CommandBehavior, CommandCheckConfig } from './types.js';
import { normalizeText } from './normalize.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;

export class CheckExecutionError extends Error {}

export async function runCommandCheck(check: CommandCheckConfig, root = process.cwd()): Promise<CommandBehavior> {
  const cwd = check.cwd ? path.resolve(root, check.cwd) : root;
  const timeoutMs = check.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = check.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  return await new Promise((resolve, reject) => {
    const child = spawn(check.command, check.args ?? [], {
      cwd,
      env: { ...process.env, ...check.env },
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const finishReject = (message: string) => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new CheckExecutionError(`${check.name}: ${message}`));
    };

    const timer = setTimeout(() => finishReject(`timed out after ${timeoutMs}ms`), timeoutMs);
    timer.unref();

    child.once('error', (error) => {
      clearTimeout(timer);
      finishReject(`failed to start ${JSON.stringify(check.command)}: ${error.message}`);
    });
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes + stderrBytes > maxOutputBytes) finishReject(`output exceeded ${maxOutputBytes} bytes`);
      else stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stdoutBytes + stderrBytes > maxOutputBytes) finishReject(`output exceeded ${maxOutputBytes} bytes`);
      else stderr.push(chunk);
    });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({
        type: 'command', name: check.name, exitCode, signal,
        stdout: normalizeText(Buffer.concat(stdout).toString('utf8'), check.normalize?.stdout),
        stderr: normalizeText(Buffer.concat(stderr).toString('utf8'), check.normalize?.stderr)
      });
    });
  });
}
