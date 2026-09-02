export interface RegexReplacement {
  pattern: string;
  flags?: string;
  replacement?: string;
}

export interface StreamNormalization {
  replacements?: RegexReplacement[];
  trimTrailingWhitespace?: boolean;
}

export interface CommandNormalization {
  stdout?: StreamNormalization;
  stderr?: StreamNormalization;
}

export interface JsonNormalization {
  ignorePaths?: string[];
}

interface BaseCommandCheckConfig {
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface CommandCheckConfig extends BaseCommandCheckConfig {
  type: 'command';
  normalize?: CommandNormalization;
}

export interface JsonCommandCheckConfig extends BaseCommandCheckConfig {
  type: 'json-command';
  normalize?: JsonNormalization;
}

export type CheckConfig = CommandCheckConfig | JsonCommandCheckConfig;

export interface BehaviorLockConfig {
  version: 1;
  checks: CheckConfig[];
}

export interface CommandBehavior {
  type: 'command';
  name: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface JsonCommandBehavior {
  type: 'json-command';
  name: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  json: unknown;
  stderr: string;
}

export type BehaviorSnapshot = CommandBehavior | JsonCommandBehavior;

export interface BaselineFile {
  version: 1;
  checks: BehaviorSnapshot[];
}

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
  diff?: string;
  path?: string;
}

export interface CheckDiff {
  name: string;
  changes: FieldChange[];
}

export interface VerifyResult {
  status: 'unchanged' | 'changed';
  unchanged: number;
  changed: number;
  checks: CheckDiff[];
}
