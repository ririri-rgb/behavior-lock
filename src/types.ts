export interface RegexReplacement {
  pattern: string;
  flags?: string;
  replacement?: string;
}

export interface StreamNormalization {
  replacements?: RegexReplacement[];
}

export interface CommandNormalization {
  stdout?: StreamNormalization;
  stderr?: StreamNormalization;
}

export interface CommandCheckConfig {
  type: 'command';
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  normalize?: CommandNormalization;
}

export interface BehaviorLockConfig {
  version: 1;
  checks: CommandCheckConfig[];
}

export interface CommandBehavior {
  type: 'command';
  name: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface BaselineFile {
  version: 1;
  checks: CommandBehavior[];
}

export interface FieldChange {
  field: 'exitCode' | 'signal' | 'stdout' | 'stderr';
  before: string | number | null;
  after: string | number | null;
  diff?: string;
}

export interface CheckDiff {
  name: string;
  changes: FieldChange[];
}
