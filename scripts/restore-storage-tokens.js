/**
 * scripts/restore-storage-tokens.js
 *
 * Emergency recovery for the token-loss caused by compress-storage-images.js.
 *
 * When Firebase Storage's Admin SDK overwrites a file via file.save(), the
 * `firebaseStorageDownloadTokens` custom-metadata entry is dropped. All the
 * URLs already stored in Firestore contain the OLD token, so requests come
 * back 403 and the app renders broken images.
 *
 * We already have the old tokens — they're inside the URLs Firestore is
 * still handing to the client. This script:
 *   1. Sweeps every collection that holds a Storage URL
 *   2. Parses out {path, token} from each URL
 *   3. Reattaches the token as `firebaseStorageDownloadTokens` on the file
 *
 * After it runs, the untouched Firestore URLs work again. Firestore is not
 * modified.
 *
 * Usage:
 *   node scripts/restore-storage-tokens.js          # dry run
 *   node scripts/restore-storage-tokens.js --apply  # actually write metadata
 */

/* eslint-disable no-console */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes('--apply');

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
const db = admin.firestore();

const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com';

// Firebase download URL format:
//   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media&token={uuid}
function parseUrl(url) {
  if (typeof url !== 'string' || !url.includes(FIREBASE_STORAGE_HOST)) return null;
  const m = url.match(/\/o\/([^?]+)\?[^#]*[?&]token=([a-f0-9-]+)/i);
  if (!m) return null;
  return { path: decodeURIComponent(m[1]), token: m[2] };
}

function collectUrlsFromDoc(data, out) {
  if (!data || typeof data !== 'object') return;

  // Common fields that hold a Storage URL. Keys are broad on purpose — the
  // script deduplicates by (path, token) so any accidental hit is harmless.
  const stringKeys = [
    'companyLogo', 'photoURL', 'photoUrl', 'linkedinPicture',
    'imageUrl', 'image', 'coverImage', 'attachment', 'attachmentUrl',
    'url', 'iconUrl',
  ];
  for (const k of stringKeys) {
    if (typeof data[k] === 'string' && data[k].includes(FIREBASE_STORAGE_HOST)) out.add(data[k]);
  }

  // Array of image URLs.
  if (Array.isArray(data.images)) {
    for (const u of data.images) {
      if (typeof u === 'string' && u.includes(FIREBASE_STORAGE_HOST)) out.add(u);
    }
  }
  if (Array.isArray(data.attachments)) {
    for (const a of data.attachments) {
      if (typeof a === 'string' && a.includes(FIREBASE_STORAGE_HOST)) out.add(a);
      else if (a && typeof a.url === 'string' && a.url.includes(FIREBASE_STORAGE_HOST)) out.add(a.url);
    }
  }
}

async function walkTopLevel(collectionName, out) {
  try {
    const snap = await db.collection(collectionName).get();
    snap.forEach((doc) => collectUrlsFromDoc(doc.data(), out));
    console.log(`  ${collectionName}: scanned ${snap.size} docs`);
  } catch (err) {
    console.warn(`  ${collectionName}: skipped (${err.message})`);
  }
}

async function collectAllUrls() {
  const out = new Set();

  console.log('Scanning Firestore for Storage URLs…');
  const candidates = [
    'users', 'products', 'requests', 'deals', 'fairs',
    'news', 'categories', 'announcements', 'trades',
  ];
  for (const c of candidates) await walkTopLevel(c, out);

  return out;
}

async function restoreOne(url) {
  const parsed = parseUrl(url);
  if (!parsed) return { url, skipped: 'unparseable' };

  const file = bucket.file(parsed.path);
  const [exists] = await file.exists();
  if (!exists) return { url, path: parsed.path, skipped: 'file-missing' };

  const [meta] = await file.getMetadata();
  const existing = meta?.metadata?.firebaseStorageDownloadTokens;
  if (existing && existing.includes(parsed.token)) {
    return { url, path: parsed.path, skipped: 'token-already-present' };
  }

  if (!DRY_RUN) {
    await file.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: parsed.token,
      },
    });
  }

  return { url, path: parsed.path, restored: true };
}

async function main() {
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Mode:   ${DRY_RUN ? 'dry-run (no writes)' : 'APPLY (writing metadata)'}`);
  console.log('---');

  const urls = await collectAllUrls();
  console.log(`\nFound ${urls.size} unique Storage URLs in Firestore\n`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const res = await restoreOne(url);
      if (res.restored) {
        restored += 1;
        console.log(`  restored: ${res.path}`);
      } else {
        skipped += 1;
        console.log(`  skipped (${res.skipped}): ${res.path || res.url.slice(0, 80)}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  FAILED ${url.slice(0, 80)}: ${err.message}`);
    }
  }

  console.log('\n---');
  console.log(`Restored: ${restored}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  if (DRY_RUN) {
    console.log('\nRe-run with --apply to actually reattach the tokens.');
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
