/**
 * ResendBackfillCard
 *
 * Admin-only tile in the Users tab. Fires the `backfillResendContacts`
 * Cloud Function which iterates every user in Firestore and adds them
 * to the Resend Audience (honouring the local `unsubscribes/*` list).
 *
 * Safe to click multiple times — the CF swallows 409 Conflict for
 * contacts that are already in the audience.
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import { Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResendBackfillCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [limit, setLimit] = useState(1000);

  const runBackfill = async () => {
    setLoading(true);
    setResult(null);
    try {
      const call = httpsCallable(getFunctionsInstance(), 'backfillResendContacts');
      const res = await call({ limit });
      const data = res.data || {};
      setResult(data);
      toast.success(
        `Backfill done — added ${data.added ?? 0}, already-in ${data.alreadyIn ?? 0}, skipped ${data.skipped ?? 0}, errors ${data.errorCount ?? 0}`,
        { duration: 6000 }
      );
    } catch (err) {
      console.error('backfillResendContacts failed:', err);
      toast.error(err?.message || 'Resend backfill failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-base mb-1">Resend Audience Backfill</h3>
          <p className="text-[#A0A0A0] text-sm mb-4">
            Load existing users into the Resend Audience so future broadcasts reach them.
            New sign-ups are already added automatically. Users on the local unsubscribe list
            are pushed as {`unsubscribed`}. Duplicates are skipped.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              Max users
              <input
                type="number"
                min="1"
                max="5000"
                value={limit}
                disabled={loading}
                onChange={(e) => setLimit(Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 5000))}
                className="w-24 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
              />
            </label>
            <button
              type="button"
              onClick={runBackfill}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Run Backfill
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="mt-4 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Scanned" value={result.scanned} />
                <Stat label="Added" value={result.added} accent="#4ade80" />
                <Stat label="Already in" value={result.alreadyIn} accent="#94a3b8" />
                <Stat label="Errors" value={result.errorCount} accent={result.errorCount ? '#f87171' : '#94a3b8'} />
              </div>
              {Array.isArray(result.errors) && result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[#A0A0A0] hover:text-white">
                    Show first {result.errors.length} error(s)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-red-300 max-h-32 overflow-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>
                        <span className="text-[#A0A0A0]">{err.email}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = '#ffffff' }) {
  return (
    <div>
      <div className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-0.5">{label}</div>
      <div className="font-bold text-lg" style={{ color: accent }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

export default ResendBackfillCard;
