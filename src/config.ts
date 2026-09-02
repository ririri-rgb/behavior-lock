import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { BehaviorLockConfig, CommandCheckConfig, RegexReplacement } from './types.js';

export const CONFIG_FILE = 'behavior-lock.json';

function fail(message: string): never {
  throw new Error(`Invalid ${CONFIG_FILE}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) fail(`${label} must be an array of strings`);
  return value as string[];
}

function parseReplacements(value: unknown, label: string): RegexReplacement[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.pattern !== 'string') fail(`${label}[${index}].pattern must be a string`);
    if (entry.flags !== undefined && typeof entry.flags !== 'string') fail(`${label}[${index}].flags must be a string`);
    if (entry.replacement !== undefined && typeof entry.replacement !== 'string') fail(`${label}[${index}].replacement must be a string`);
    try { new RegExp(entry.pattern, typeof entry.flags === 'string' ? entry.flags : 'g'); } catch { fail(`${label}[${index}] has an invalid regular expression`); }
    return {
      pattern: entry.pattern,
      ...(typeof entry.flags === 'string' ? { flags: entry.flags } : {}),
      ...(typeof entry.replacement === 'string' ? { replacement: entry.replacement } : {})
    };
  });
}

function parseCheck(value: unknown, index: number): CommandCheckConfig {
  if (!isRecord(value)) fail(`checks[${index}] must be an object`);
  if (value.type !== 'command') fail(`checks[${index}].type must be "command" in v0.1`);
  if (typeof value.name !== 'string' || value.name.trim() === '') fail(`checks[${index}].name must be a non-empty string`);
  if (typeof value.command !== 'string' || value.command.trim() === '') fail(`checks[${index}].command must be a non-empty string`);
  const args = optionalStringArray(value.args, `checks[${index}].args`);
  if (value.cwd !== undefined && typeof value.cwd !== 'string') fail(`checks[${index}].cwd must be a string`);
  if (value.timeoutMs !== undefined && (!Number.isInteger(value.timeoutMs) || (value.timeoutMs as number) <= 0)) fail(`checks[${index}].timeoutMs must be a positive integer`);
  if (value.maxOutputBytes !== undefined && (!Number.isInteger(value.maxOutputBytes) || (value.maxOutputBytes as number) <= 0)) fail(`checks[${index}].maxOutputBytes must be a positive integer`);
  let env: Record<string, string> | undefined;
  if (value.env !== undefined) {
    if (!isRecord(value.env) || Object.values(value.env).some((entry) => typeof entry !== 'string')) fail(`checks[${index}].env must contain string values only`);
    env = value.env as Record<string, string>;
  }
  let normalize: CommandCheckConfig['normalize'];
  if (value.normalize !== undefined) {
    if (!isRecord(value.normalize)) fail(`checks[${index}].normalize must be an object`);
    const stdout = value.normalize.stdout;
    const stderr = value.normalize.stderr;
    const parseStream = (stream: unknown, label: string) => {
      if (stream === undefined) return undefined;
      if (!isRecord(stream)) fail(`${label} must be an object`);
      const replacements = parseReplacements(stream.replacements, `${label}.replacements`);
      return replacements ? { replacements } : {};
    };
    const stdoutParsed = parseStream(stdout, `checks[${index}].normalize.stdout`);
    const stderrParsed = parseStream(stderr, `checks[${index}].normalize.stderr`);
    normalize = { ...(stdoutParsed ? { stdout: stdoutParsed } : {}), ...(stderrParsed ? { stderr: stderrParsed } : {}) };
  }
  return {
    type: 'command', name: value.name, command: value.command,
    ...(args ? { args } : {}),
    ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}),
    ...(env ? { env } : {}),
    ...(typeof value.timeoutMs === 'number' ? { timeoutMs: value.timeoutMs } : {}),
    ...(typeof value.maxOutputBytes === 'number' ? { maxOutputBytes: value.maxOutputBytes } : {}),
    ...(normalize ? { normalize } : {})
  };
}

export async function loadConfig(root = process.cwd()): Promise<BehaviorLockConfig> {
  const filePath = path.join(root, CONFIG_FILE);
  let raw: string;
  try { raw = await readFile(filePath, 'utf8'); } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') throw new Error(`${CONFIG_FILE} not found in ${root}`);
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { fail('must contain valid JSON'); }
  if (!isRecord(parsed)) fail('root must be an object');
  if (parsed.version !== 1) fail('version must be 1');
  if (!Array.isArray(parsed.checks) || parsed.checks.length === 0) fail('checks must be a non-empty array');
  const checks = parsed.checks.map(parseCheck);
  const names = new Set<string>();
  for (const check of checks) {
    if (names.has(check.name)) fail(`duplicate check name: ${check.name}`);
    names.add(check.name);
  }
  return { version: 1, checks };
}
