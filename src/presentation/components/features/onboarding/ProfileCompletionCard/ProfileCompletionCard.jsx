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
 * - "Complete Profile" button links to /profile/[uid] (< 100%)
 * - "View Profile" button links to /profile/[uid] (= 100%)
 *
 * Props:
 *   user {object} — user object from AuthContext (includes uid, role, and profile fields)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, X } from 'lucide-react';

/**
 * Fields checked for profile completion.
 * Each field is weighted equally (1 / total).
 */
const COMPLETION_FIELDS = [
  { key: 'companyName', label: 'Company name' },
  { key: 'companyLogo', label: 'Company logo' },
  { key: 'country', label: 'Country' },
  { key: 'phone', label: 'Phone number' },
  { key: 'about', label: 'Company description' },
  { key: 'companyWebsite', label: 'Website' },
  { key: 'companyDocuments', label: 'Company documents' },
];

export function ProfileCompletionCard({ user }) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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

  if (!user) return null;

  // Calculate completion percentage (arrays must have length > 0)
  const completedCount = COMPLETION_FIELDS.filter((f) => {
    const val = user[f.key];
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

  const profileHref = user?.uid
    ? percent === 100
      ? `/profile/${user.uid}`
      : `/profile/${user.uid}?highlight=incomplete`
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

      {/* Field checklist */}
      <ul className="space-y-2 mb-5">
        {COMPLETION_FIELDS.map((field) => {
          const val = user[field.key];
          const done = Array.isArray(val) ? val.length > 0 : !!val;
          return (
            <li key={field.key} className="flex items-center gap-2.5">
              {done ? (
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-gray-600 shrink-0" aria-hidden="true" />
              )}
              <span
                className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-300'}`}
              >
                {field.label}
              </span>
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
