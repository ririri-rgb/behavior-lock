import type { StreamNormalization } from './types.js';

export function normalizeText(value: string, config?: StreamNormalization): string {
  let result = value.replace(/\r\n?/g, '\n');
  for (const rule of config?.replacements ?? []) {
    const flags = rule.flags ?? 'g';
    result = result.replace(new RegExp(rule.pattern, flags), rule.replacement ?? '<ignored>');
  }
  if (config?.trimTrailingWhitespace) result = result.split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n');
  return result;
}
