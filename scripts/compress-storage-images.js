/**
 * scripts/compress-storage-images.js
 *
 * Walks the Firebase Storage bucket, resizes and recompresses every user
 * upload in place. Existing objects keep their names and extensions, so
 * the URLs stored in Firestore stay valid — only the bytes change.
 *
 * Path-aware sizing:
 *   users/{uid}/company-logo/*     → max 800px
 *   users/{uid}/products/*         → max 1200px
 *   users/{uid}/profile.*          → max 800px (onboarding avatar)
 *   users/{uid}/messages/*         → skipped (attachments)
 *   users/{uid}/legal/*            → skipped (legal evidence)
 *   everything else                → max 1600px
 *
 * Usage:
 *   node scripts/compress-storage-images.js          # dry run (default)
 *   node scripts/compress-storage-images.js --apply  # actually write
 *   node scripts/compress-storage-images.js --apply --prefix users/xyz/
 *
 * Requires serviceAccountKey.json in the repo root (already present) and
 * the FIREBASE_STORAGE_BUCKET env var, or falls back to the value below.
 */

/* eslint-disable no-console */

const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes('--apply');
const PREFIX_FLAG = argv.indexOf('--prefix');
const PREFIX = PREFIX_FLAG >= 0 ? argv[PREFIX_FLAG + 1] : '';

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

function sizeForPath(p) {
  if (/\/messages\//.test(p) || /\/legal\//.test(p)) return null; // skip
  if (/\/company-logo\//.test(p) || /\/profile\./.test(p)) return 800;
  if (/\/products\//.test(p)) return 1200;
  return 1600;
}

function formatForPath(p) {
  if (/\.png$/i.test(p)) return { fn: 'png', opts: { quality: 90, compressionLevel: 9, palette: true } };
  if (/\.webp$/i.test(p)) return { fn: 'webp', opts: { quality: 82 } };
  // Default to JPEG for jpg/jpeg/anything else — best mainstream compression.
  return { fn: 'jpeg', opts: { quality: 82, mozjpeg: true } };
}

async function processOne(file) {
  const p = file.name;
  const maxSize = sizeForPath(p);
  if (maxSize === null) return { path: p, skipped: 'protected-path' };
  if (!/\.(jpe?g|png|webp)$/i.test(p)) return { path: p, skipped: 'not-image' };

  // Read the existing custom metadata BEFORE anything else. Firebase Storage
  // download URLs authenticate via `firebaseStorageDownloadTokens` living in
  // custom metadata; overwriting the file with file.save() replaces custom
  // metadata, and if we don't hand the token back in the same call every URL
  // already stored in Firestore starts returning 403.
  const [remoteMeta] = await file.getMetadata();
  const existingToken = remoteMeta?.metadata?.firebaseStorageDownloadTokens;
  if (!existingToken) {
    // No token means either (a) the file was never handed to the client with a
    // token URL and it's safe to skip, or (b) restoration hasn't run yet and
    // touching it now would leave it in the same broken state. Either way,
    // don't gamble.
    return { path: p, skipped: 'no-download-token' };
  }

  const [origBuf] = await file.download();
  const origBytes = origBuf.length;

  let meta;
  try {
    meta = await sharp(origBuf).metadata();
  } catch {
    return { path: p, skipped: 'unreadable' };
  }

  // Bail on assets that are already tiny and well within target dimensions —
  // recompressing tiny PNGs can even grow them.
  const alreadySmall = origBytes < 60_000 && meta.width && meta.width <= maxSize * 1.3;
  if (alreadySmall) return { path: p, skipped: 'already-small', origBytes };

  const { fn, opts } = formatForPath(p);
  const outBuf = await sharp(origBuf)
    .rotate() // respect EXIF orientation before we lose it
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    [fn](opts)
    .toBuffer();

  const savings = origBytes - outBuf.length;
  if (savings <= 0) return { path: p, skipped: 'no-savings', origBytes, newBytes: outBuf.length };

  if (!DRY_RUN) {
    // Persist the download token in the same call so existing Firestore URLs
    // keep working after the overwrite.
    await file.save(outBuf, {
      contentType: remoteMeta.contentType || `image/${fn === 'jpeg' ? 'jpeg' : fn}`,
      resumable: false,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: existingToken,
          compressed_at: new Date().toISOString(),
          original_size: String(origBytes),
        },
      },
    });

    // Verify the token survived — Storage's metadata handling has been known
    // to strip fields silently. If it's gone, put it back explicitly.
    const [verify] = await file.getMetadata();
    if (verify?.metadata?.firebaseStorageDownloadTokens !== existingToken) {
      await file.setMetadata({
        metadata: {
          firebaseStorageDownloadTokens: existingToken,
        },
      });
    }
  }

  return { path: p, origBytes, newBytes: outBuf.length, savings };
}

async function main() {
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: ${PREFIX || '(all)'}`);
  console.log(`Mode:   ${DRY_RUN ? 'dry-run (no writes)' : 'APPLY (will overwrite)'}`);
  console.log('---');

  const [files] = await bucket.getFiles({ prefix: PREFIX });
  console.log(`Listed ${files.length} objects\n`);

  let totalOrig = 0;
  let totalNew = 0;
  let processed = 0;
  const skips = {};

  for (const f of files) {
    let res;
    try {
      res = await processOne(f);
    } catch (err) {
      console.error(`ERROR ${f.name}: ${err.message}`);
      continue;
    }

    if (res.skipped) {
      skips[res.skipped] = (skips[res.skipped] || 0) + 1;
      continue;
    }

    totalOrig += res.origBytes;
    totalNew += res.newBytes;
    processed += 1;
    const orig = (res.origBytes / 1024).toFixed(1);
    const nw = (res.newBytes / 1024).toFixed(1);
    const pct = ((1 - res.newBytes / res.origBytes) * 100).toFixed(0);
    console.log(`${res.path}  ${orig} → ${nw} KiB  (-${pct}%)`);
  }

  console.log('\n---');
  console.log(`Processed: ${processed}`);
  console.log(`Skipped:   ${JSON.stringify(skips)}`);
  console.log(
    `Bytes:     ${(totalOrig / 1024 / 1024).toFixed(2)} MiB → ${(totalNew / 1024 / 1024).toFixed(2)} MiB` +
    ` (savings: ${((totalOrig - totalNew) / 1024 / 1024).toFixed(2)} MiB)`
  );
  if (DRY_RUN) {
    console.log('\nRe-run with --apply to write these changes back to Storage.');
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
