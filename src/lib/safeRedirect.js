/**
 * Post-login redirect targets (?redirect=, ?next=, the LinkedIn redirect
 * cookie) come from the URL, so anyone can craft them. Only paths on this
 * site are allowed; anything else falls back.
 *
 * Checking `startsWith('/')` is not enough: browsers read "//evil.com",
 * "/\evil.com" and "/<tab>/evil.com" as links to evil.com. Resolving the
 * value with the URL parser (which applies those same rules) and requiring
 * the origin to stay unchanged catches all of them.
 *
 * @param {unknown} raw
 * @param {string|null} [fallback='/'] returned when raw is missing or unsafe
 * @returns {string|null} a same-site path such as "/my-sponsorships?tab=1"
 */
export function safeRedirectPath(raw, fallback = '/') {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return fallback;
  const base = 'https://same-site.invalid';
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
