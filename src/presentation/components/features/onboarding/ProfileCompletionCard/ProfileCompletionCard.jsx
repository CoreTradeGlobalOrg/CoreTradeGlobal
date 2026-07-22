/**
 * ProfileCompletionCard Component
 *
 * Shows a profile completion progress bar and field checklist to encourage
 * users to fill out their profile. Renders fixed in the top-right corner of
 * the homepage below the ticker and navbar.
 *
 * Behaviour:
 * - Always visible regardless of completion percentage (never auto-hides at 100%)
 * - Dismissable per browser session via sessionStorage (comes back on next login/visit)
 * - Live: subscribes to users/{uid} via onSnapshot so filling a field on
 *   the profile page ticks the checkbox and grows the bar without a refresh.
 * - Each checklist row is a clickable link — jumps to the profile page,
 *   highlights the field, and scrolls it into the middle of the viewport.
 * - "Complete Profile" button links to /profile/[uid]?highlight=incomplete
 *
 * Props:
 *   user {object} — user object from AuthContext (only .uid is required here;
 *                   real-time field values come from the Firestore snapshot)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

/**
 * Fields checked for profile completion.
 * Each field is weighted equally (1 / total).
 * `focus` is the value passed via `?focus=` so the profile page can
 * scroll to the matching element and center it in the viewport.
 */
const COMPLETION_FIELDS = [
  { key: 'companyName', label: 'Company name', focus: 'companyName' },
  { key: 'companyLogo', label: 'Company logo', focus: 'companyLogo' },
  { key: 'country', label: 'Country', focus: 'country' },
  { key: 'phone', label: 'Phone number', focus: 'phone' },
  { key: 'about', label: 'Company description', focus: 'about' },
  { key: 'companyWebsite', label: 'Website', focus: 'companyWebsite' },
  { key: 'companyDocuments', label: 'Company documents', focus: 'companyDocuments' },
];

export function ProfileCompletionCard({ user }) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Live user doc from Firestore. AuthContext only fetches once at
  // login, so we can't rely on its `user` prop to reflect edits made
  // on /profile without a refresh. A cheap per-user onSnapshot here
  // keeps the checklist ticking in real time.
  const [liveUser, setLiveUser] = useState(null);

  // Read sessionStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (user?.uid) {
      const key = `profileCardDismissed_${user.uid}`;
      if (sessionStorage.getItem(key) === '1') {
        setDismissed(true);
      }
    }
    setHydrated(true);
  }, [user?.uid]);

  // Real-time subscription to users/{uid}. Cleans up on unmount and on
  // uid change. If Firestore reads fail (auth loss, transient error)
  // we fall back to the prop-provided user so the card degrades to
  // its old one-shot behaviour instead of blanking.
  useEffect(() => {
    if (!user?.uid) {
      setLiveUser(null);
      return undefined;
    }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setLiveUser({ uid: user.uid, ...snap.data() });
        }
      },
      (err) => {
        console.warn('ProfileCompletionCard snapshot error:', err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  if (!user) return null;

  // Use live snapshot data when we have it; fall back to the AuthContext
  // user object during the first paint / on subscription failure.
  const source = liveUser || user;

  // Calculate completion percentage (arrays must have length > 0)
  const completedCount = COMPLETION_FIELDS.filter((f) => {
    const val = source[f.key];
    return Array.isArray(val) ? val.length > 0 : !!val;
  }).length;
  const total = COMPLETION_FIELDS.length;
  const percent = Math.round((completedCount / total) * 100);

  // Hide during SSR and before hydration check (avoids flash)
  if (!hydrated) return null;

  // Hide for current session if dismissed
  if (dismissed) return null;

  // Hide permanently when profile is 100% complete
  if (percent === 100) return null;

  const handleDismiss = () => {
    if (user?.uid) {
      sessionStorage.setItem(`profileCardDismissed_${user.uid}`, '1');
    }
    setDismissed(true);
  };

  const buildFieldHref = (focus) =>
    user?.uid
      ? `/profile/${user.uid}?highlight=incomplete&focus=${focus}`
      : '/profile';

  const profileHref = user?.uid
    ? `/profile/${user.uid}?highlight=incomplete`
    : '/profile';

  return (
    <div className="glass-card p-5 border border-[#2A3B52] rounded-xl">
      {/* Header row: title + badge + skip */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-sm leading-tight">
          Complete Your Profile
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
              percent >= 50
                ? 'bg-[#FFD700]/15 text-[#FFD700]'
                : 'bg-white/10 text-gray-400'
            }`}
          >
            {percent}%
          </span>
          <button
            onClick={handleDismiss}
            aria-label="Skip profile completion card for this session"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-1.5 py-1 rounded-md hover:bg-white/5"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gold progress bar */}
      <div className="bg-[#2A3B52] rounded-full h-2 mb-5" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="bg-gradient-to-r from-[#FFD700] to-[#FDB931] rounded-full h-2 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Field checklist — each row is a link that jumps to the
          matching field on the profile page and centers it. */}
      <ul className="space-y-2 mb-5">
        {COMPLETION_FIELDS.map((field) => {
          const val = source[field.key];
          const done = Array.isArray(val) ? val.length > 0 : !!val;
          return (
            <li key={field.key}>
              <Link
                href={buildFieldHref(field.focus)}
                onClick={handleDismiss}
                className={`group flex items-center gap-2.5 rounded-md px-1 py-0.5 transition-colors ${
                  done ? 'hover:bg-white/[0.03]' : 'hover:bg-[rgba(255,215,0,0.06)]'
                }`}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-600 group-hover:text-[#FFD700] transition-colors shrink-0" aria-hidden="true" />
                )}
                <span
                  className={`text-sm transition-colors ${
                    done
                      ? 'text-gray-400 line-through'
                      : 'text-gray-300 group-hover:text-white'
                  }`}
                >
                  {field.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <Link
        href={profileHref}
        onClick={handleDismiss}
        className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity"
      >
        Complete Profile
      </Link>
    </div>
  );
}

export default ProfileCompletionCard;
