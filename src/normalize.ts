import type { RegexReplacement, StreamNormalization } from './types.js';

function applyReplacement(value: string, rule: RegexReplacement): string {
  const flags = rule.flags ?? 'g';
  return value.replace(new RegExp(rule.pattern, flags), rule.replacement ?? '<ignored>');
}

export function normalizeText(value: string, config?: StreamNormalization): string {
  let result = value.replace(/\r\n?/g, '\n');
  for (const rule of config?.replacements ?? []) result = applyReplacement(result, rule);
  return result;
}
