/**
 * Returnerar den kanoniska adressen om en omdirigering behövs, annars null.
 *
 * - http://dajjen.me/...      -> https://dajjen.me/...
 * - https://www.dajjen.me/... -> https://dajjen.me/...
 * - Andra värdar (workers.dev, localhost) lämnas orörda så att
 *   förhandsvisningar och lokal utveckling fungerar.
 */
export function canonicalRedirect(url, canonicalHost) {
  const host = url.hostname;
  const isCanonicalHost = host === canonicalHost;
  const isWww = host === `www.${canonicalHost}`;
  if (!isCanonicalHost && !isWww) return null;

  const needsHttps = url.protocol !== "https:";
  if (!needsHttps && isCanonicalHost) return null;

  const target = new URL(url);
  target.protocol = "https:";
  target.hostname = canonicalHost;
  target.port = "";
  return target.toString();
}
