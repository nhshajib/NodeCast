import { httpURL, importXtreamLink } from './provider.ts';

export type PastedProvider = { kind: 'xtream' | 'm3u'; address: string; username: string; password: string; name?: string };
const field = (text: string, names: string[]) => {
  for (const name of names) {
    const match = text.match(new RegExp(`(?:^|\\n|\\s)${name}\\s*[:=]\\s*([^\\s\\n]+)`, 'i'));
    if (match) return match[1].trim().replace(/[.,;]+$/, '');
  }
  return '';
};
/**
 * Reads the details a provider usually sends: an Xtream "get.php"/"player_api.php" link, an M3U link,
 * or "Server / Username / Password" lines. Nothing is sent anywhere; the result only fills the form,
 * and connecting still uses the normal validation and sign-in.
 */
export function parseProviderDetails(raw: string): PastedProvider | null {
  const text = raw.replace(/\r/g, '').slice(0, 8000);
  if (!text.trim()) return null;
  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const url of urls) {
    const login = importXtreamLink(url);
    if (login) return { kind: 'xtream', ...login };
  }
  const server = field(text, ['server', 'host', 'url', 'portal', 'dns', 'domain', 'address']);
  const username = field(text, ['username', 'user', 'login', 'user name']);
  const password = field(text, ['password', 'pass', 'pwd']);
  if (server && username && password) {
    try { const address = httpURL(/^https?:\/\//i.test(server) ? server : `http://${server}`); return { kind: 'xtream', address: address.replace(/\/(get|player_api)\.php.*$/i, ''), username, password }; } catch { /* fall through */ }
  }
  const playlist = urls.find(url => /\.m3u8?(\?|$)|[?&]type=m3u/i.test(url)) || (urls.length === 1 ? urls[0] : '');
  if (playlist) { try { return { kind: 'm3u', address: httpURL(playlist.replace(/[.,;)]+$/, '')), username: '', password: '' }; } catch { return null; } }
  return null;
}
/** Shows only the last two characters of a secret. */
export const maskSecret = (value: string) => !value ? '' : value.length <= 2 ? '••' : `${'•'.repeat(Math.min(8, value.length - 2))}${value.slice(-2)}`;
/** Hides credentials that sit inside a playlist link's query string. */
export function maskAddress(address: string) {
  try {
    const url = new URL(address);
    for (const key of [...url.searchParams.keys()]) if (/user|pass|token|key|auth/i.test(key)) url.searchParams.set(key, '••••');
    return url.href.replace(/%E2%80%A2/g, '•');
  } catch { return address; }
}
