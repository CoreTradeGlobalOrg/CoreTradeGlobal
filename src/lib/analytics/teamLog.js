/**
 * Team Daily Log — data layer.
 *
 * Manual outreach log the admin team fills in daily. Backs the
 * dashboard's Team Daily Log section (Bölüm 8 of the plan). Firestore
 * collection: `teamDailyLog` with the compound doc id `{date}_{uid}`
 * — one entry per person per day, upsert on re-save.
 *
 * As with the other analytics queries, no component reads/writes the
 * Firestore SDK for team-log data directly; everything goes through
 * this module so a future Postgres switch is one-file work.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';

// --- constants -------------------------------------------------------------

export const TEAM_LOG_COLLECTION = 'teamDailyLog';

/**
 * Channels the form collects. Keeping the vocabulary explicit here so
 * both the write path and the read/aggregation path stay in sync — a
 * new channel added in one place breaks the other loudly.
 */
export const CHANNELS = [
  { key: 'linkedinConnect', label: 'LinkedIn Bağlantı', group: 'LinkedIn' },
  { key: 'linkedinDM', label: 'LinkedIn InMail / DM', group: 'LinkedIn' },
  { key: 'linkedinComment', label: 'LinkedIn Yorum', group: 'LinkedIn' },
  { key: 'emailBulk', label: 'Email — Toplu', group: 'Email' },
  { key: 'emailPersonal', label: 'Email — Kişisel', group: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp', group: 'Diğer' },
  { key: 'other', label: 'Diğer', group: 'Diğer' },
];

export const CHANNEL_KEYS = CHANNELS.map((c) => c.key);

// --- helpers ---------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd in the browser's local timezone. */
export function toDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function docIdFor(dateKey, uid) {
  return `${dateKey}_${uid}`;
}

function normaliseChannels(input = {}) {
  const out = {};
  for (const key of CHANNEL_KEYS) {
    const raw = input[key];
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    out[key] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

/** Sum of all channel counts on one entry. */
function entryTotal(channels) {
  let sum = 0;
  for (const key of CHANNEL_KEYS) sum += channels[key] || 0;
  return sum;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// --- team roster -----------------------------------------------------------

/**
 * Team members eligible to file a log — admin users on the platform.
 * The plan calls for an admin-configured roster; using role='admin' is
 * the cheapest first-cut source of truth. A dedicated `teamMembers`
 * collection can replace this later without touching the UI.
 */
export async function getTeamMembers() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('role', '==', 'admin')),
  );
  return snap.docs
    .map((d) => {
      const data = d.data() || {};
      // Prefer the internal fullName over the public displayName. Some
      // admin accounts intentionally carry a generic display name for
      // user-facing surfaces ("Admin", "CoreTradeGlobal Support Team")
      // while fullName holds the real person for internal analytics
      // views. Fallback chain keeps rows without a fullName visible.
      return {
        uid: d.id,
        displayName: data.fullName || data.displayName || data.email || d.id,
        email: data.email || '',
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
}

// --- single entry read / write --------------------------------------------

/**
 * Fetch a single entry (used to prefill the form and warn on duplicate).
 * Returns null if none exists.
 */
export async function getTeamLogEntry(dateKey, uid) {
  const ref = doc(db, TEAM_LOG_COLLECTION, docIdFor(dateKey, uid));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    id: snap.id,
    uid: data.uid || uid,
    employee: data.employee || '',
    date: data.date || dateKey,
    channels: normaliseChannels(data.channels),
    note: data.note || '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    total: entryTotal(normaliseChannels(data.channels)),
  };
}

/**
 * Upsert an entry. Compound doc id enforces one row per person per day
 * without a transaction; a re-save simply overwrites (front-end asks
 * the user to confirm before doing so).
 */
export async function saveTeamLogEntry({ uid, employee, dateKey, channels, note }) {
  if (!uid) throw new Error('uid is required');
  if (!dateKey) throw new Error('dateKey is required');

  const cleanChannels = normaliseChannels(channels);
  const ref = doc(db, TEAM_LOG_COLLECTION, docIdFor(dateKey, uid));
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      uid,
      employee: employee || '',
      date: dateKey,
      channels: cleanChannels,
      note: (note || '').trim(),
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );

  return {
    id: ref.id,
    uid,
    employee: employee || '',
    date: dateKey,
    channels: cleanChannels,
    note: (note || '').trim(),
    total: entryTotal(cleanChannels),
  };
}

// --- ranged aggregate ------------------------------------------------------

/**
 * Fetch every entry inside a [start, end] date-key range and return
 * per-employee totals + team totals. Range is inclusive on both ends.
 *
 * @param {{ startKey: string, endKey: string }} args
 * @returns {Promise<{
 *   startKey: string,
 *   endKey: string,
 *   totalMessages: number,
 *   perEmployee: Array<{
 *     uid: string,
 *     employee: string,
 *     channels: Record<string, number>,
 *     total: number,
 *     lastEntry: Date | null,
 *   }>,
 *   channelTotals: Record<string, number>,
 * }>}
 */
export async function getTeamLogSummary({ startKey, endKey }) {
  const q = query(
    collection(db, TEAM_LOG_COLLECTION),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
  );
  const snap = await getDocs(q);

  const perEmployeeMap = new Map(); // uid -> aggregate row
  const channelTotals = Object.fromEntries(CHANNEL_KEYS.map((k) => [k, 0]));
  let totalMessages = 0;

  snap.forEach((d) => {
    const data = d.data() || {};
    const uid = data.uid;
    if (!uid) return;
    const channels = normaliseChannels(data.channels);
    const entryUpdatedAt = toDate(data.updatedAt);
    const employee = data.employee || uid;

    let row = perEmployeeMap.get(uid);
    if (!row) {
      row = {
        uid,
        employee,
        channels: Object.fromEntries(CHANNEL_KEYS.map((k) => [k, 0])),
        total: 0,
        lastEntry: null,
      };
      perEmployeeMap.set(uid, row);
    } else if (!row.employee && employee) {
      row.employee = employee;
    }

    for (const key of CHANNEL_KEYS) {
      const v = channels[key] || 0;
      row.channels[key] += v;
      channelTotals[key] += v;
      totalMessages += v;
      row.total += v;
    }

    if (entryUpdatedAt && (!row.lastEntry || entryUpdatedAt > row.lastEntry)) {
      row.lastEntry = entryUpdatedAt;
    }
  });

  const perEmployee = Array.from(perEmployeeMap.values()).sort((a, b) => b.total - a.total);

  return {
    startKey,
    endKey,
    totalMessages,
    perEmployee,
    channelTotals,
  };
}

/**
 * Daily totals over the last `days` days for the trend line. Returns
 * one row per calendar date in the range, zero-filled for days with
 * no entries.
 */
export async function getTeamLogTrend({ days = 30 } = {}) {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * MS_PER_DAY);
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(now);

  const q = query(
    collection(db, TEAM_LOG_COLLECTION),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
  );
  const snap = await getDocs(q);

  const byDate = new Map();
  snap.forEach((d) => {
    const data = d.data() || {};
    const key = data.date;
    if (!key) return;
    const total = entryTotal(normaliseChannels(data.channels));
    byDate.set(key, (byDate.get(key) || 0) + total);
  });

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * MS_PER_DAY);
    const key = toDateKey(d);
    series.push({ date: key, total: byDate.get(key) || 0 });
  }
  return series;
}

// --- missing-entry warnings ------------------------------------------------

/**
 * Flag team members who haven't filed an entry in the last N days.
 * "Yesterday missed" and "3-day silence" bubble up as amber/red flags
 * on the panel.
 */
export async function getMissingEntryWarnings({ days = 3 } = {}) {
  const [members, summary] = await Promise.all([
    getTeamMembers(),
    getTeamLogSummary({
      startKey: toDateKey(new Date(Date.now() - days * MS_PER_DAY)),
      endKey: toDateKey(new Date()),
    }),
  ]);

  const byUid = new Map(summary.perEmployee.map((row) => [row.uid, row]));
  const now = Date.now();

  return members.map((member) => {
    const row = byUid.get(member.uid);
    const lastEntry = row?.lastEntry || null;
    const daysSince = lastEntry
      ? Math.floor((now - lastEntry.getTime()) / MS_PER_DAY)
      : Infinity;
    let severity = 'ok';
    if (daysSince === Infinity) severity = 'red';
    else if (daysSince >= days) severity = 'red';
    else if (daysSince >= 1) severity = 'amber';
    return {
      uid: member.uid,
      displayName: member.displayName,
      lastEntry,
      daysSince: daysSince === Infinity ? null : daysSince,
      severity,
    };
  });
}

// --- range helpers ---------------------------------------------------------

/**
 * Convert a friendly range preset ('today' | 'week' | 'month') to
 * concrete { startKey, endKey } bounds. Week = last 7 days including
 * today; month = last 30 days.
 */
export function rangeBounds(range = 'today') {
  const now = new Date();
  if (range === 'today') {
    const key = toDateKey(now);
    return { startKey: key, endKey: key };
  }
  const daysBack = range === 'week' ? 6 : 29; // inclusive → 7 / 30 buckets
  const start = new Date(now.getTime() - daysBack * MS_PER_DAY);
  return { startKey: toDateKey(start), endKey: toDateKey(now) };
}
