/** Legacy backup/settings validation; no public-IP lookup is performed. */
export function isIP(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split('.').every(part => Number(part) <= 255);
  // Service-provided IPv6; exclude URL delimiters and arbitrary remote text.
  if (!value.includes(':') || !/^[a-f\d:]+$/i.test(value) || value.length > 39) return false;
  try { return !!new URL(`http://[${value}]/`).hostname; } catch { return false; }
}
