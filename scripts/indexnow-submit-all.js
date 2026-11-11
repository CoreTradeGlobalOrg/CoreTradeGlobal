/**
 * scripts/indexnow-submit-all.js
 *
 * One-off IndexNow submission of every URL in the live sitemap, so Bing,
 * Yandex and the other IndexNow engines learn about pages that existed
 * before the indexNow* Cloud Functions were deployed. After that the
 * functions ping new and changed pages on their own.
 *
 * Run it only after the key file (public/<key>.txt) is live on
 * production, or IndexNow answers 403.
 *
 * Usage:
 *   node scripts/indexnow-submit-all.js          # dry run: lists the URLs
 *   node scripts/indexnow-submit-all.js --apply  # submits them
 *
 * Uses the same code as the functions (functions/utils/indexNow.js); no
 * credentials needed.
 */

/* eslint-disable no-console */

const { INDEXNOW_KEY, SITE_URL, submitUrls } = require('../functions/utils/indexNow');

const apply = process.argv.includes('--apply');

async function main() {
  const keyUrl = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
  const keyRes = await fetch(keyUrl);
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (keyBody !== INDEXNOW_KEY) {
    console.error(`Key file not live yet: ${keyUrl} (HTTP ${keyRes.status}). Deploy it to production first.`);
    process.exit(1);
  }

  const sitemapRes = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!sitemapRes.ok) {
    console.error(`Could not fetch sitemap.xml (HTTP ${sitemapRes.status})`);
    process.exit(1);
  }
  const xml = await sitemapRes.text();
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  console.log(`Sitemap has ${urls.length} URL(s).`);

  if (!apply) {
    urls.slice(0, 20).forEach((u) => console.log(`  ${u}`));
    if (urls.length > 20) console.log(`  … and ${urls.length - 20} more`);
    console.log('\nDry run. Re-run with --apply to submit.');
    return;
  }

  const result = await submitUrls(urls);
  if (!result.ok) {
    console.error(`Submission failed (HTTP ${result.status ?? 'n/a'}), ${result.submitted} URL(s) sent.`);
    process.exit(1);
  }
  console.log(`Done: ${result.submitted} URL(s) submitted (HTTP ${result.status}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
