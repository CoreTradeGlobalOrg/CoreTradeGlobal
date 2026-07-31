#!/usr/bin/env node

/**
 * Backfill: user.companyType
 *
 * The sign-up form always collected companyType ('trade' | 'logistics'
 * | 'insurance') but the RegisterUseCase + CompleteProfileForm write
 * paths only persisted the derived `role`, so every existing user
 * document is missing `companyType` and the profile card shows
 * "Not set" for everyone. The write paths are fixed going forward;
 * this script backfills the past by deriving companyType from role.
 *
 * Deterministic role → companyType mapping:
 *   member              -> trade      (trade is the only companyType
 *                                       that maps to the generic member
 *                                       role)
 *   logistics_provider  -> logistics
 *   insurance_provider  -> insurance
 *   admin               -> admin      (fixed per user request)
 *   lawyer              -> lawyer     (fixed per user request)
 *
 * Anything else (unknown role, missing role) is SKIPPED and logged —
 * we do not guess on unfamiliar shapes.
 *
 * SAFETY:
 *   - Dry-run by default. Prints exactly which docs would change,
 *     what the current companyType is (or missing), what it would
 *     become, plus counts by bucket.
 *   - Apply mode only runs when you explicitly pass --apply. It uses
 *     writeBatch chunks of 400 (Firestore's cap is 500 to be safe)
 *     and pauses briefly between batches.
 *   - Idempotent: skips any user that already has a valid
 *     companyType value.
 *
 * USAGE:
 *   Dry run (default, no writes):
 *     node scripts/backfill-company-type.js
 *
 *   Apply (writes to production Firestore):
 *     node scripts/backfill-company-type.js --apply
 *
 *   Optional: force overwrite even when companyType is already set
 *   (rarely needed — only if a bad value slipped in previously):
 *     node scripts/backfill-company-type.js --apply --overwrite
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// -------------------------------------------------------------------
// Firebase admin bootstrap — matches scripts/migrate-category-ids.js
// -------------------------------------------------------------------
const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ scripts/serviceAccountKey.json is missing.');
  console.error('   Download the Firebase service account key from');
  console.error('   Firebase Console → Project Settings → Service Accounts');
  console.error('   and save it as scripts/serviceAccountKey.json.');
  process.exit(1);
}
const serviceAccount = require(keyPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// -------------------------------------------------------------------
// Mapping — keep in sync with src/core/constants/companyTypes.js
// (deliberately duplicated here rather than imported: this script is
// CommonJS + node, the source is ESM + browser bundle, and the two
// module systems don't share loaders. If a new role lands, add it in
// BOTH places and rerun this script.)
// -------------------------------------------------------------------
const ROLE_TO_COMPANY_TYPE = {
  member: 'trade',
  logistics_provider: 'logistics',
  insurance_provider: 'insurance',
  admin: 'admin',
  lawyer: 'lawyer',
};
const VALID_COMPANY_TYPES = new Set(Object.values(ROLE_TO_COMPANY_TYPE));

// -------------------------------------------------------------------
// CLI flags
// -------------------------------------------------------------------
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const OVERWRITE = args.has('--overwrite');

const MODE = APPLY ? (OVERWRITE ? 'APPLY (overwrite)' : 'APPLY') : 'DRY RUN';

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('======================================================');
  console.log(`  Backfill user.companyType — mode: ${MODE}`);
  console.log('======================================================');
  console.log('');

  const snap = await db.collection('users').get();
  console.log(`Scanned ${snap.size} user documents.\n`);

  const buckets = {
    willWrite: [],
    alreadySet: [],
    alreadySetInvalid: [],
    skipUnknownRole: [],
    skipMissingRole: [],
  };

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const current = data.companyType;
    const role = data.role;

    if (current) {
      if (VALID_COMPANY_TYPES.has(current)) {
        if (OVERWRITE) {
          // In overwrite mode we still write, but note it separately.
          const derived = ROLE_TO_COMPANY_TYPE[role];
          if (derived && derived !== current) {
            buckets.willWrite.push({ id: doc.id, role, current, next: derived });
          } else {
            buckets.alreadySet.push({ id: doc.id, role, current });
          }
        } else {
          buckets.alreadySet.push({ id: doc.id, role, current });
        }
        return;
      }
      // A companyType exists but is not one we recognise.
      buckets.alreadySetInvalid.push({ id: doc.id, role, current });
      return;
    }

    if (!role) {
      buckets.skipMissingRole.push({ id: doc.id, email: data.email || '(no email)' });
      return;
    }

    const derived = ROLE_TO_COMPANY_TYPE[role];
    if (!derived) {
      buckets.skipUnknownRole.push({ id: doc.id, role, email: data.email || '(no email)' });
      return;
    }

    buckets.willWrite.push({ id: doc.id, role, current: null, next: derived });
  });

  // ----------------------------------------------------------------
  // Report
  // ----------------------------------------------------------------
  console.log('--- Summary ---');
  console.log(`  will write   : ${buckets.willWrite.length}`);
  console.log(`  already set  : ${buckets.alreadySet.length}`);
  console.log(`  already set (unrecognised value) : ${buckets.alreadySetInvalid.length}`);
  console.log(`  skip: unknown role : ${buckets.skipUnknownRole.length}`);
  console.log(`  skip: missing role : ${buckets.skipMissingRole.length}`);
  console.log('');

  // Bucket write plan by target companyType so it's easy to eyeball.
  if (buckets.willWrite.length > 0) {
    const byTarget = {};
    for (const row of buckets.willWrite) {
      byTarget[row.next] = (byTarget[row.next] || 0) + 1;
    }
    console.log('--- Write plan by target companyType ---');
    for (const [target, count] of Object.entries(byTarget).sort()) {
      console.log(`  ${target.padEnd(10)} : ${count}`);
    }
    console.log('');

    // Print first 20 rows for spot-check
    console.log('--- First 20 writes (spot check) ---');
    for (const row of buckets.willWrite.slice(0, 20)) {
      const from = row.current === null ? '(none)' : row.current;
      console.log(`  ${row.id}  role=${row.role.padEnd(20)}  ${from} → ${row.next}`);
    }
    if (buckets.willWrite.length > 20) {
      console.log(`  … and ${buckets.willWrite.length - 20} more`);
    }
    console.log('');
  }

  if (buckets.alreadySetInvalid.length > 0) {
    console.log('--- Users with an UNRECOGNISED existing companyType (not touching, please review) ---');
    for (const row of buckets.alreadySetInvalid) {
      console.log(`  ${row.id}  role=${row.role || '(none)'}  current=${JSON.stringify(row.current)}`);
    }
    console.log('');
  }

  if (buckets.skipUnknownRole.length > 0) {
    console.log('--- Skipped: unknown role (please review, may need ROLE_TO_COMPANY_TYPE update) ---');
    for (const row of buckets.skipUnknownRole) {
      console.log(`  ${row.id}  role=${JSON.stringify(row.role)}  email=${row.email}`);
    }
    console.log('');
  }

  if (buckets.skipMissingRole.length > 0) {
    console.log('--- Skipped: missing role field (please review manually) ---');
    for (const row of buckets.skipMissingRole) {
      console.log(`  ${row.id}  email=${row.email}`);
    }
    console.log('');
  }

  // ----------------------------------------------------------------
  // Apply (only when explicitly asked)
  // ----------------------------------------------------------------
  if (!APPLY) {
    console.log('DRY RUN complete. Re-run with --apply to write these changes.');
    process.exit(0);
  }

  if (buckets.willWrite.length === 0) {
    console.log('Nothing to write. Exiting.');
    process.exit(0);
  }

  console.log(`Writing ${buckets.willWrite.length} documents in batches of 400 …\n`);
  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < buckets.willWrite.length; i += BATCH_SIZE) {
    const chunk = buckets.willWrite.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const row of chunk) {
      const ref = db.collection('users').doc(row.id);
      batch.update(ref, {
        companyType: row.next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: wrote ${chunk.length}  (running total ${written}/${buckets.willWrite.length})`);
    // Brief pause between batches so we don't hammer Firestore quotas.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('');
  console.log(`✓ Backfill complete. Wrote companyType on ${written} user documents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
