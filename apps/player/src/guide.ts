export type Programme = { id: string; title: string; description: string; start: number; end: number };
export function guideText(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (!/^[A-Za-z\d+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return value;
  try {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let buffer = 0, bits = 0; const bytes: number[] = [];
    for (const character of value.replace(/=+$/, '')) {
      buffer = (buffer << 6) | alphabet.indexOf(character); bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
    }
    const decoded = decodeURIComponent(bytes.map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''));
    return /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(decoded) ? value : decoded;
  } catch { return value; }
}
function epoch(value: unknown, fallback: unknown): number | null {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (Number.isFinite(number) && number > 0) return number > 1e12 ? number : number * 1000;
  // Never guess a provider's timezone from an unzoned date/time string.
  if (typeof fallback === 'string' && /(Z|[+-]\d\d:\d\d)$/.test(fallback)) { const time = Date.parse(fallback); return Number.isFinite(time) ? time : null; }
  return null;
}
export function parseProgrammes(value: unknown): Programme[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(row => {
    if (!row || typeof row !== 'object') return [];
    const start = epoch(row.start_timestamp, row.start);
    const end = epoch(row.stop_timestamp ?? row.end_timestamp, row.end);
    if (!start || !end || end <= start) return [];
    return [{ id: String(row.id || `${start}-${end}`), title: guideText(row.title) || 'Untitled programme', description: guideText(row.description), start, end }];
  }).sort((a, b) => a.start - b.start);
}
export function nowAndNext(programmes: Programme[], now = Date.now()) {
  return { current: programmes.find(item => item.start <= now && item.end > now), next: programmes.find(item => item.start > now) };
}
