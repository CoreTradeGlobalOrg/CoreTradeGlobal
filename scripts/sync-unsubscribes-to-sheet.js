#!/usr/bin/env node
/**
 * Manual sync: Firestore `unsubscribes` collection → Google Sheet.
 *
 * Usage:
 *   npm run sync-unsubscribes
 *
 * Required:
 *   - scripts/serviceAccountKey.json  (GCP service account with Firestore + Sheets access)
 *     or GOOGLE_APPLICATION_CREDENTIALS env var pointing to a key file
 *   - UNSUBSCRIBE_SHEET_ID in .env (the target Google Sheet ID)
 *   - Google Sheets API enabled on the GCP project
 *   - The sheet shared with the service account email as Editor
 *
 * Behavior:
 *   - Idempotent: clears `Sheet1` then rewrites it from Firestore.
 *   - Columns: email | unsubscribedAt | lastClickAt | source
 */

const fs = require('fs');
const path = require('path');

// --- Minimal .env loader (avoid adding dotenv dep) ------------------------
function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const SHEET_ID = process.env.UNSUBSCRIBE_SHEET_ID;
if (!SHEET_ID) {
  console.error('ERROR: UNSUBSCRIBE_SHEET_ID is not set in .env');
  process.exit(1);
}

// --- Service account key --------------------------------------------------
const localKeyPath = path.resolve(process.cwd(), 'scripts/serviceAccountKey.json');
let serviceAccount;
if (fs.existsSync(localKeyPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  serviceAccount = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
  );
} else {
  console.error(
    'ERROR: No service account key found. Place it at scripts/serviceAccountKey.json ' +
      'or set GOOGLE_APPLICATION_CREDENTIALS.'
  );
  process.exit(1);
}

// --- Firebase Admin -------------------------------------------------------
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}
const db = admin.firestore();

// --- Google Sheets --------------------------------------------------------
const { google } = require('googleapis');

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

function tsToIso(ts) {
  if (!ts) return '';
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  return '';
}

async function main() {
  console.log('→ Reading unsubscribes from Firestore…');
  const snapshot = await db.collection('unsubscribes').orderBy('unsubscribedAt', 'desc').get();
  console.log(`  Found ${snapshot.size} unsubscribes.`);

  const header = ['email', 'unsubscribedAt', 'lastClickAt', 'source'];
  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      d.email || d.emailLower || '',
      tsToIso(d.unsubscribedAt),
      tsToIso(d.lastClickAt),
      d.source || '',
    ];
  });

  console.log('→ Connecting to Google Sheets…');
  const sheets = await getSheetsClient();

  console.log(`→ Clearing Sheet1 in spreadsheet ${SHEET_ID}…`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1',
  });

  console.log(`→ Writing ${rows.length + 1} rows (header + data)…`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [header, ...rows] },
  });

  console.log('✓ Sync complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
