import { spawn } from 'node:child_process';
import path from 'node:path';
import type { BehaviorSnapshot, CheckConfig, CommandBehavior, CommandCheckConfig } from './types.js';
import { normalizeJson } from './json.js';
import { normalizeText } from './normalize.js';

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;
export class CheckExecutionError extends Error {}

export async function runCheck(check: CheckConfig, root = process.cwd()): Promise<BehaviorSnapshot> {
  const cwd = check.cwd ? path.resolve(root, check.cwd) : root;
  const timeoutMs = check.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = check.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  return await new Promise((resolve, reject) => {
    const child = spawn(check.command, check.args ?? [], { cwd, env: { ...process.env, ...check.env }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = []; const stderr: Buffer[] = []; let bytes = 0; let settled = false;
    const fail = (message: string) => { if (settled) return; settled = true; child.kill('SIGKILL'); reject(new CheckExecutionError(`${check.name}: ${message}`)); };
    const timer = setTimeout(() => fail(`timed out after ${timeoutMs}ms`), timeoutMs); timer.unref();
    child.once('error', (error) => { clearTimeout(timer); fail(`failed to start ${JSON.stringify(check.command)}: ${error.message}`); });
    const collect = (target: Buffer[]) => (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxOutputBytes) fail(`output exceeded ${maxOutputBytes} bytes`); else target.push(chunk); };
    child.stdout.on('data', collect(stdout)); child.stderr.on('data', collect(stderr));
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer); if (settled) return; settled = true;
      const stdoutText = Buffer.concat(stdout).toString('utf8').replace(/\r\n?/g, '\n');
      const stderrText = Buffer.concat(stderr).toString('utf8').replace(/\r\n?/g, '\n');
      if (check.type === 'json-command') {
        let parsed: unknown;
        try { parsed = JSON.parse(stdoutText); } catch { reject(new CheckExecutionError(`${check.name}: stdout was not valid JSON`)); return; }
        resolve({ type: 'json-command', name: check.name, exitCode, signal, json: normalizeJson(parsed, check.normalize?.ignorePaths), stderr: stderrText });
      } else resolve({ type: 'command', name: check.name, exitCode, signal, stdout: normalizeText(stdoutText, check.normalize?.stdout), stderr: normalizeText(stderrText, check.normalize?.stderr) });
    });
  });
}

export async function runCommandCheck(check: CommandCheckConfig, root = process.cwd()): Promise<CommandBehavior> {
  return await runCheck(check, root) as CommandBehavior;
}
