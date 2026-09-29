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
    // Same key-cleanup pattern as src/lib/firebase-admin.js: env-var
    // payloads often flatten the PEM private_key onto one line, which
    // breaks the OpenSSL decoder. Reconstruct newlines every 64 chars.
    let cleaned = keyRaw;
    try {
      JSON.parse(cleaned);
    } catch {
      cleaned = cleaned.replace(/\\n/g, '');
    }
    const serviceAccount = JSON.parse(cleaned);
    if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
      const pk = serviceAccount.private_key
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '');
      serviceAccount.private_key =
        '-----BEGIN PRIVATE KEY-----\n' +
        pk.match(/.{1,64}/g).join('\n') +
        '\n-----END PRIVATE KEY-----\n';
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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
