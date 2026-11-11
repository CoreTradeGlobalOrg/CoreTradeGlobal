/**
 * IndexNow: tells Bing, Yandex, Seznam, Naver and Yep that a public page
 * was added, changed or removed, so they recrawl it within minutes instead
 * of waiting for the next sitemap crawl. One submission to
 * api.indexnow.org is shared with every participating engine. Google does
 * not take part; it keeps using the sitemap and Search Console.
 *
 * The key is public by design: engines verify it by fetching
 * https://www.coretradeglobal.com/<key>.txt (public/<key>.txt in the Next
 * app). Changing the key means renaming that file too.
 *
 * Shared by the Firestore triggers in index.js and
 * scripts/indexnow-submit-all.js. No dependencies, so the script can
 * require it without installing the functions packages.
 */

const INDEXNOW_KEY = '36ce2e5a69e4367eed5aa490e84f30d5';
const SITE_HOST = 'www.coretradeglobal.com';
const SITE_URL = `https://${SITE_HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// IndexNow accepts up to 10,000 URLs per request.
const MAX_URLS_PER_REQUEST = 10000;

/**
 * Submit absolute URLs on SITE_HOST. Never throws: a failed ping only
 * means the engines find the change on their next crawl, so a trigger
 * must not retry or fail because of it.
 *
 * @param {string[]} urls
 * @returns {Promise<{ ok: boolean, status?: number, submitted: number }>}
 */
async function submitUrls(urls) {
  // IndexNow rejects the whole request if any URL is on another host.
  const urlList = [...new Set(urls)].filter(
    (u) => typeof u === 'string' && (u === SITE_URL || u.startsWith(`${SITE_URL}/`))
  );
  if (urlList.length === 0) return { ok: true, submitted: 0 };

  // The emulator must not announce localhost test data as live pages.
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log(`[indexnow] emulator, skipped ${urlList.length} URL(s)`);
    return { ok: true, submitted: 0 };
  }

  let submitted = 0;
  let lastStatus;
  for (let i = 0; i < urlList.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = urlList.slice(i, i + MAX_URLS_PER_REQUEST);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: SITE_HOST,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: chunk,
        }),
        signal: AbortSignal.timeout(15000),
      });
      lastStatus = res.status;
      // 200 = accepted, 202 = accepted while the key is still being verified.
      if (res.status !== 200 && res.status !== 202) {
        const body = await res.text().catch(() => '');
        console.error(`[indexnow] HTTP ${res.status} for ${chunk.length} URL(s): ${body.slice(0, 200)}`);
        return { ok: false, status: res.status, submitted };
      }
      submitted += chunk.length;
    } catch (err) {
      console.error('[indexnow] request failed:', err.message || err);
      return { ok: false, submitted };
    }
  }

  console.log(`[indexnow] submitted ${submitted} URL(s) (HTTP ${lastStatus})`);
  return { ok: true, status: lastStatus, submitted };
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

/**
 * Whether a Firestore write changed what a public page shows to search
 * engines. `isListed` mirrors the filter src/app/sitemap.js uses for that
 * collection. Pings when a document enters or leaves that set (create,
 * publish, close, delete) or when a listed document is edited (updatedAt
 * moves). Counter writes such as viewCount leave updatedAt alone, so
 * they never ping.
 *
 * @param {object|undefined} before
 * @param {object|undefined} after
 * @param {(doc: object) => boolean} isListed
 */
function pageChanged(before, after, isListed) {
  const wasListed = !!before && isListed(before);
  const nowListed = !!after && isListed(after);
  if (!wasListed && !nowListed) return false;
  if (wasListed !== nowListed) return true;
  return toMillis(before.updatedAt) !== toMillis(after.updatedAt);
}

module.exports = {
  INDEXNOW_KEY,
  SITE_HOST,
  SITE_URL,
  submitUrls,
  pageChanged,
};
