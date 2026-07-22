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
import { CheckCircle, Circle, X, ChevronDown } from 'lucide-react';
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
  // Collapsed state — dropdown-style, header stays visible so the
  // user can still see the % badge at a glance. Persisted per-user
  // in localStorage so the choice survives navigations. Defaults to
  // expanded on first visit.
  const [collapsed, setCollapsed] = useState(false);
  // Live user doc from Firestore. AuthContext only fetches once at
  // login, so we can't rely on its `user` prop to reflect edits made
  // on /profile without a refresh. A cheap per-user onSnapshot here
  // keeps the checklist ticking in real time.
  const [liveUser, setLiveUser] = useState(null);

  // Read sessionStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (user?.uid) {
      const dismissKey = `profileCardDismissed_${user.uid}`;
      if (sessionStorage.getItem(dismissKey) === '1') {
        setDismissed(true);
      }
      const collapseKey = `profileCardCollapsed_${user.uid}`;
      if (localStorage.getItem(collapseKey) === '1') {
        setCollapsed(true);
      }
    }
    setHydrated(true);
  }, [user?.uid]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (user?.uid) {
        try {
          localStorage.setItem(`profileCardCollapsed_${user.uid}`, next ? '1' : '0');
        } catch {
          // ignore quota / privacy-mode errors
        }
      }
      return next;
    });
  };

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
      {/* Header row: clickable to toggle collapsed state. Title + %
          badge stay visible when collapsed so the card behaves like a
          dropdown. The Close (X) button dismisses for the session and
          is intentionally NOT nested inside the toggle button — its
          click stops propagation so it doesn't also toggle collapse. */}
      <div className={`flex items-center justify-between gap-2 ${collapsed ? '' : 'mb-4'}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex-1 flex items-center justify-between gap-2 min-w-0 text-left rounded-md px-1 -mx-1 py-1 -my-1 hover:bg-white/[0.03] transition-colors"
        >
          <h2 className="text-white font-semibold text-sm leading-tight truncate">
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
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                collapsed ? '' : 'rotate-180'
              }`}
              aria-hidden="true"
            />
          </div>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close profile completion card for this session"
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsible body — progress bar + checklist + CTA */}
      {!collapsed && (
        <>
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
        </>
      )}
    </div>
  );
}

export default ProfileCompletionCard;
