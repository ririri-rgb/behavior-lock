function pathSegments(path: string): (string | number)[] {
  if (!path.startsWith('$')) throw new Error(`Invalid JSON path: ${path}`);
  const segments: (string | number)[] = [];
  const re = /\.([A-Za-z_$][\w$-]*)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path))) segments.push(match[1] ?? Number(match[2]));
  return segments;
}

export function normalizeJson(value: unknown, ignorePaths: string[] = []): unknown {
  const clone = structuredClone(value);
  for (const path of ignorePaths) {
    const segments = pathSegments(path);
    if (segments.length === 0) return '<ignored>';
    let cursor: unknown = clone;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;
      if (cursor === null || typeof cursor !== 'object') { cursor = undefined; break; }
      cursor = (cursor as Record<string | number, unknown>)[segment];
    }
    if (cursor !== null && typeof cursor === 'object') {
      const key = segments.at(-1)!;
      if (key in (cursor as Record<string | number, unknown>)) (cursor as Record<string | number, unknown>)[key] = '<ignored>';
    }
  }
  return clone;
}
