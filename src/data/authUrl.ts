export function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const parts: string[] = [];
  if (queryIndex >= 0) {
    const end = hashIndex > queryIndex ? hashIndex : url.length;
    parts.push(...url.slice(queryIndex + 1, end).split('&'));
  }
  if (hashIndex >= 0) parts.push(...url.slice(hashIndex + 1).split('&'));
  for (const part of parts) {
    if (!part) continue;
    const separator = part.indexOf('=');
    const rawKey = separator === -1 ? part : part.slice(0, separator);
    const rawValue = separator === -1 ? '' : part.slice(separator + 1);
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      out[rawKey] = rawValue;
    }
  }
  return out;
}
