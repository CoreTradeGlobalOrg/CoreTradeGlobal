#!/usr/bin/env node

/**
 * Cleanup: drop `user.companyType` from every user document.
 *
 * The read path in ProfileCard now derives the display label from
 * `user.role` via ROLE_TO_COMPANY_TYPE — the persisted `companyType`
 * field is no longer read anywhere. RegisterUseCase and
 * CompleteProfileForm still WRITE it for now (dropping their writes
 * is a follow-up refactor), but the field is otherwise dead data.
 *
 * This script removes it. Not urgent — the field is harmless while
 * unused — but keeps the schema honest and prevents future drift.
 *
 * SAFETY:
 *   - Dry-run by default. Prints how many docs would change.
 *   - Apply mode only runs when you pass --apply. Uses writeBatch
 *     chunks of 400 and pauses briefly between batches.
 *   - Idempotent: skips any user document that already has no
 *     companyType.
 *
 * USAGE:
 *   node scripts/cleanup-company-type-field.js           # dry run
 *   node scripts/cleanup-company-type-field.js --apply   # writes
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

  const snap = await db.collection('users').get();
  const willClear = [];
  let alreadyClean = 0;

  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.companyType === undefined) {
      alreadyClean += 1;
    } else {
      willClear.push({ id: doc.id, current: data.companyType, role: data.role });
    }
  });

  console.log(`Scanned ${snap.size} users.`);
  console.log(`  will clear:    ${willClear.length}`);
  console.log(`  already clean: ${alreadyClean}\n`);

  if (!APPLY) {
    console.log('DRY RUN. Re-run with --apply to write.');
    process.exit(0);
  }

  if (willClear.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  const BATCH = 400;
  let done = 0;
  for (let i = 0; i < willClear.length; i += BATCH) {
    const chunk = willClear.slice(i, i + BATCH);
    const batch = db.batch();
    for (const row of chunk) {
      batch.update(db.collection('users').doc(row.id), {
        companyType: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    done += chunk.length;
    console.log(`  batch ${Math.floor(i / BATCH) + 1}: cleared ${chunk.length}  (${done}/${willClear.length})`);
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n✓ Cleared companyType on ${done} user documents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
