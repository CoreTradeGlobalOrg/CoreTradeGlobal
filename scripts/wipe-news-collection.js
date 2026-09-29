#!/usr/bin/env node
/**
 * One-shot: delete every document in the Firestore `news` collection.
 *
 * The news module was retired in Sept 2026. Rules + routes are already
 * gone; this script clears out the leftover data so backups + exports
 * don't keep dragging it around.
 *
 * Usage (from repo root):
 *   node scripts/wipe-news-collection.js
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or GOOGLE_APPLICATION_CREDENTIALS
 * pointed at a service-account file for the `core-trade-global` project.
 * Safe to re-run — a second pass just finds zero docs and exits.
 */

const admin = require('firebase-admin');

function initAdmin() {
  const keyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ACCOUNT_SERVICE_KEY;
  if (keyRaw) {
    // Env-var payloads sometimes ship with literal `\n` inside the
    // private_key. JSON.parse handles those; the block below rewires
    // real newlines if the parse choked.
    let parsed;
    try {
      parsed = JSON.parse(keyRaw);
    } catch {
      parsed = JSON.parse(keyRaw.replace(/\\n/g, '\n'));
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed) });
    return;
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC.
  admin.initializeApp();
}

async function wipe() {
  const db = admin.firestore();
  const col = db.collection('news');
  const BATCH_SIZE = 400;
  let total = 0;

  while (true) {
    const snap = await col.limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    console.log(`Deleted ${total} docs so far…`);
    if (snap.size < BATCH_SIZE) break;
  }

  console.log(`Done. Removed ${total} news docs.`);
}

initAdmin();
wipe().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
