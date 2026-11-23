import type { Media, Provider } from './provider.ts';

/**
 * Channel logos are kept in their own small store, separate from catalogue snapshots,
 * so lists show them right after a restart without refetching the playlist. Only plain
 * image URLs are kept: anything carrying login details, credential-like query values or
 * the provider's username or password is dropped.
 */
const secretKey = /user|pass|pwd|token|key|auth|sig|session|secret/i;
export function safeLogo(url: string | undefined, provider?: Pick<Provider, 'username' | 'password'>): string | undefined {
  if (!url || url.length > 1000) return undefined;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return undefined; }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
  if (parsed.username || parsed.password) return undefined;
  for (const key of parsed.searchParams.keys()) if (secretKey.test(key)) return undefined;
  const plain = decodeURIComponent(parsed.href);
  for (const secret of [provider?.username, provider?.password]) if (secret && secret.length >= 3 && plain.includes(secret)) return undefined;
  return parsed.href;
}
/** id → logo for every item with a safe logo. */
export function logoMap(items: Media[], provider?: Pick<Provider, 'username' | 'password'>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) { const logo = safeLogo(item.logo, provider); if (logo) map[item.id] = logo; }
  return map;
}
/** Adds saved logos to items that don't already have one. */
export function withLogos<T extends Pick<Media, 'id' | 'logo'>>(items: T[], map: Record<string, string> | null): T[] {
  if (!map) return items;
  return items.map(item => !item.logo && map[item.id] ? { ...item, logo: map[item.id] } : item);
}
