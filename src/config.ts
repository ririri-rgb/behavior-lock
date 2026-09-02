import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BehaviorLockConfig, CheckConfig, CommandCheckConfig, RegexReplacement } from './types.js';

export const CONFIG_FILE = 'behavior-lock.json';
function fail(message: string): never { throw new Error(`Invalid ${CONFIG_FILE}: ${message}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function strings(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) fail(`${label} must be an array of strings`);
  return value as string[];
}
function replacements(value: unknown, label: string): RegexReplacement[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((entry, i) => {
    if (!isRecord(entry) || typeof entry.pattern !== 'string') fail(`${label}[${i}].pattern must be a string`);
    if (entry.flags !== undefined && typeof entry.flags !== 'string') fail(`${label}[${i}].flags must be a string`);
    if (entry.replacement !== undefined && typeof entry.replacement !== 'string') fail(`${label}[${i}].replacement must be a string`);
    try { new RegExp(entry.pattern, typeof entry.flags === 'string' ? entry.flags : 'g'); } catch { fail(`${label}[${i}] has an invalid regular expression`); }
    return { pattern: entry.pattern, ...(typeof entry.flags === 'string' ? { flags: entry.flags } : {}), ...(typeof entry.replacement === 'string' ? { replacement: entry.replacement } : {}) };
  });
}

function parseCheck(value: unknown, index: number): CheckConfig {
  if (!isRecord(value)) fail(`checks[${index}] must be an object`);
  if (value.type !== 'command' && value.type !== 'json-command') fail(`checks[${index}].type must be "command" or "json-command"`);
  if (typeof value.name !== 'string' || !value.name.trim()) fail(`checks[${index}].name must be a non-empty string`);
  if (typeof value.command !== 'string' || !value.command.trim()) fail(`checks[${index}].command must be a non-empty string`);
  const args = strings(value.args, `checks[${index}].args`);
  if (value.cwd !== undefined && typeof value.cwd !== 'string') fail(`checks[${index}].cwd must be a string`);
  for (const key of ['timeoutMs', 'maxOutputBytes'] as const) if (value[key] !== undefined && (!Number.isInteger(value[key]) || (value[key] as number) <= 0)) fail(`checks[${index}].${key} must be a positive integer`);
  let env: Record<string, string> | undefined;
  if (value.env !== undefined) {
    if (!isRecord(value.env) || Object.values(value.env).some((entry) => typeof entry !== 'string')) fail(`checks[${index}].env must contain string values only`);
    env = value.env as Record<string, string>;
  }
  const base = { name: value.name, command: value.command, ...(args ? { args } : {}), ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}), ...(env ? { env } : {}), ...(typeof value.timeoutMs === 'number' ? { timeoutMs: value.timeoutMs } : {}), ...(typeof value.maxOutputBytes === 'number' ? { maxOutputBytes: value.maxOutputBytes } : {}) };
  if (value.type === 'json-command') {
    let normalize: { ignorePaths?: string[] } | undefined;
    if (value.normalize !== undefined) {
      if (!isRecord(value.normalize)) fail(`checks[${index}].normalize must be an object`);
      const ignorePaths = strings(value.normalize.ignorePaths, `checks[${index}].normalize.ignorePaths`);
      normalize = ignorePaths ? { ignorePaths } : {};
    }
    return { type: 'json-command', ...base, ...(normalize ? { normalize } : {}) };
  }
  let commandNormalize: CommandCheckConfig['normalize'];
  if (value.normalize !== undefined) {
    if (!isRecord(value.normalize)) fail(`checks[${index}].normalize must be an object`);
    const parseStream = (stream: unknown, label: string) => {
      if (stream === undefined) return undefined;
      if (!isRecord(stream)) fail(`${label} must be an object`);
      if (stream.trimTrailingWhitespace !== undefined && typeof stream.trimTrailingWhitespace !== 'boolean') fail(`${label}.trimTrailingWhitespace must be boolean`);
      const rules = replacements(stream.replacements, `${label}.replacements`);
      return { ...(rules ? { replacements: rules } : {}), ...(typeof stream.trimTrailingWhitespace === 'boolean' ? { trimTrailingWhitespace: stream.trimTrailingWhitespace } : {}) };
    };
    const stdout = parseStream(value.normalize.stdout, `checks[${index}].normalize.stdout`);
    const stderr = parseStream(value.normalize.stderr, `checks[${index}].normalize.stderr`);
    commandNormalize = { ...(stdout ? { stdout } : {}), ...(stderr ? { stderr } : {}) };
  }
  return { type: 'command', ...base, ...(commandNormalize ? { normalize: commandNormalize } : {}) };
}

export async function loadConfig(root = process.cwd()): Promise<BehaviorLockConfig> {
  let raw: string;
  try { raw = await readFile(path.join(root, CONFIG_FILE), 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`${CONFIG_FILE} not found in ${root}`);
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { fail('must contain valid JSON'); }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.checks)) fail('root must contain version: 1 and checks: []');
  const checks = parsed.checks.map(parseCheck);
  const names = new Set<string>();
  for (const check of checks) { if (names.has(check.name)) fail(`duplicate check name: ${check.name}`); names.add(check.name); }
  return { version: 1, checks };
}

export async function writeConfig(config: BehaviorLockConfig, root = process.cwd()): Promise<string> {
  const target = path.join(root, CONFIG_FILE);
  await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return target;
}

export async function upsertCheck(check: CheckConfig, root = process.cwd()): Promise<void> {
  let config: BehaviorLockConfig;
  try { config = await loadConfig(root); } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) config = { version: 1, checks: [] };
    else throw error;
  }
  const index = config.checks.findIndex((entry) => entry.name === check.name);
  if (index >= 0) config.checks[index] = check; else config.checks.push(check);
  await writeConfig(config, root);
}
