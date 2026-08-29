#!/usr/bin/env node

/**
 * Cleanup: delete the `productUploadRequests` collection.
 *
 * The admin-assisted product upload flow (user asks CTG for help /
 * uploads a CSV for admin to process) has been retired. Bulk upload
 * is fully self-serve via /product/bulk now, so this collection is
 * dead data.
 *
 * The Firestore rule for `productUploadRequests` has been removed
 * as well — this script is the last janitor pass.
 *
 * SAFETY:
 *   - Dry-run by default. Prints how many docs would be deleted.
 *   - Apply mode only runs when you pass --apply. Deletes in batches
 *     of 400 with a short pause between batches.
 *
 * USAGE:
 *   node scripts/cleanup-product-upload-requests.js           # dry run
 *   node scripts/cleanup-product-upload-requests.js --apply   # deletes
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ scripts/serviceAccountKey.json is missing.');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(require(keyPath)),
});
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const snap = await db.collection('productUploadRequests').get();
  console.log(`Scanned ${snap.size} productUploadRequests documents.`);

  if (snap.size === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to delete.');
    process.exit(0);
  }

  const BATCH = 400;
  const docs = snap.docs;
  let done = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const chunk = docs.slice(i, i + BATCH);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    done += chunk.length;
    console.log(`  batch ${Math.floor(i / BATCH) + 1}: deleted ${chunk.length}  (${done}/${docs.length})`);
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n✓ Deleted ${done} productUploadRequests documents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
