/**
 * scripts/generate-product-thumbnails.js
 *
 * One-off backfill for the generateProductThumbnail Cloud Function: writes
 * the 640 px WebP card thumbnail for every existing product photo
 *
 *   users/{uid}/products/{pid}/image-0.webp
 *   → users/{uid}/products/{pid}/thumbs/image-0.webp
 *
 * using the same code as the function (functions/utils/productThumbnail.js).
 * Originals and Firestore are not touched. Photos that already have a
 * thumb are skipped unless --force is passed.
 *
 * Usage:
 *   node scripts/generate-product-thumbnails.js          # dry run (default)
 *   node scripts/generate-product-thumbnails.js --apply  # write thumbs
 *   node scripts/generate-product-thumbnails.js --apply --prefix users/xyz/
 *   node scripts/generate-product-thumbnails.js --apply --force
 *
 * Requires serviceAccountKey.json in the repo root and the functions
 * dependencies installed (`npm install` in functions/, for sharp).
 */

/* eslint-disable no-console */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const {
  THUMB_CACHE_CONTROL,
  isProductImagePath,
  thumbPathFor,
  makeThumbnail,
} = require('../functions/utils/productThumbnail');

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes('--apply');
const FORCE = argv.includes('--force');
const PREFIX_FLAG = argv.indexOf('--prefix');
const PREFIX = PREFIX_FLAG >= 0 ? argv[PREFIX_FLAG + 1] : 'users/';
const CONCURRENCY = 6;

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('Missing serviceAccountKey.json in repo root.');
  process.exit(1);
}

const BUCKET_NAME =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'core-trade-global.firebasestorage.app';

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  storageBucket: BUCKET_NAME,
});

const bucket = admin.storage().bucket();

async function processOne(file, existing) {
  const thumbPath = thumbPathFor(file.name);
  if (!FORCE && existing.has(thumbPath)) return { skipped: 'has-thumb' };

  const origBytes = Number(file.metadata.size || 0);
  if (DRY_RUN) return { origBytes };

  const [input] = await file.download();
  const thumb = await makeThumbnail(input, file.metadata.contentType);
  await bucket.file(thumbPath).save(thumb.buffer, {
    resumable: false,
    metadata: { contentType: thumb.contentType, cacheControl: THUMB_CACHE_CONTROL },
  });
  return { origBytes: input.length, newBytes: thumb.buffer.length };
}

async function main() {
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Mode:   ${DRY_RUN ? 'dry-run (no writes)' : 'APPLY (writes thumbs/)'}${FORCE ? ', --force' : ''}`);
  console.log('---');

  const [files] = await bucket.getFiles({ prefix: PREFIX });
  const existing = new Set(files.map((f) => f.name));
  const originals = files.filter((f) => isProductImagePath(f.name, f.metadata.contentType));
  console.log(`Listed ${files.length} objects, ${originals.length} product photos\n`);

  let totalOrig = 0;
  let totalNew = 0;
  let done = 0;
  let failed = 0;
  const skips = {};

  const queue = [...originals];
  async function worker() {
    while (queue.length) {
      const file = queue.shift();
      try {
        const res = await processOne(file, existing);
        if (res.skipped) {
          skips[res.skipped] = (skips[res.skipped] || 0) + 1;
          continue;
        }
        done += 1;
        totalOrig += res.origBytes;
        if (res.newBytes != null) {
          totalNew += res.newBytes;
          console.log(`${file.name}  ${(res.origBytes / 1024).toFixed(1)} → ${(res.newBytes / 1024).toFixed(1)} KiB`);
        }
      } catch (err) {
        failed += 1;
        console.error(`ERROR ${file.name}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n---');
  console.log(`${DRY_RUN ? 'Would create' : 'Created'}: ${done} thumbs`);
  console.log(`Skipped: ${JSON.stringify(skips)}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Originals: ${(totalOrig / 1024 / 1024).toFixed(2)} MiB`);
  if (!DRY_RUN) console.log(`Thumbs:    ${(totalNew / 1024 / 1024).toFixed(2)} MiB`);
  if (DRY_RUN) console.log('\nRe-run with --apply to write the thumbs.');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
