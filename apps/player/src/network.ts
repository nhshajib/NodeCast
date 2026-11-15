export type ExitIP = { ip: string; city: string; region: string; country: string; countryCode: string; isp: string; checkedAt: string };
export type IPComparison = 'unknown' | 'no-baseline' | 'same' | 'changed';
export function isIP(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split('.').every(part => Number(part) <= 255);
  // Service-provided IPv6; exclude URL delimiters and arbitrary remote text.
  if (!value.includes(':') || !/^[a-f\d:]+$/i.test(value) || value.length > 39) return false;
  try { return !!new URL(`http://[${value}]/`).hostname; } catch { return false; }
}
export function compareIP(current: ExitIP | null, baseline: string | null, stale = false): IPComparison {
  if (!current || stale) return 'unknown';
  if (!baseline) return 'no-baseline';
  const normalized = (ip: string) => { try { return ip.includes(':') ? new URL(`http://[${ip}]/`).hostname.toLowerCase() : ip.split('.').map(Number).join('.'); } catch { return ip.toLowerCase(); } };
  return normalized(current.ip) === normalized(baseline) ? 'same' : 'changed';
}
export async function lookupExitIP(signal?: AbortSignal): Promise<ExitIP> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 10000);
  try {
    const response = await fetch('https://ipwho.is/', { signal: controller.signal, credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.success !== true || !isIP(data.ip)) throw new Error();
    const text = (value: unknown) => typeof value === 'string' ? value.slice(0, 100) : '';
    return { ip: data.ip, city: text(data.city), region: text(data.region), country: text(data.country), countryCode: text(data.country_code),
      isp: text(data.connection?.isp), checkedAt: new Date().toISOString() };
  } catch {
    throw new Error('Couldn’t check your public IP. Check your connection and try again.');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
