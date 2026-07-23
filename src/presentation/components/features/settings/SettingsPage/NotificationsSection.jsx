/**
 * NotificationsSection
 *
 * Displays a 5-category notification preference grid with Email and Push toggles.
 * Reads/writes preferences from Firestore via useNotificationPreferences hook.
 */

'use client';

import { useCallback, useRef } from 'react';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useNotificationPreferences } from '@/presentation/hooks/settings/useNotificationPreferences';
import { useNotificationSound } from '@/presentation/hooks/settings/useNotificationSound';
import { LEGAL_SUPPORT_ENABLED } from '@/core/constants/featureFlags';

const CATEGORIES = [
  {
    key: 'deals',
    label: 'Deals',
    description: 'Offers, approvals, and quote updates',
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'New messages in conversations',
  },
  ...(LEGAL_SUPPORT_ENABLED
    ? [{
        key: 'legal',
        label: 'Legal',
        description: 'Engagement requests and draft updates',
      }]
    : []),
  {
    key: 'providers',
    label: 'Providers',
    description: 'Quote requests and shipment updates',
  },
  {
    key: 'system',
    label: 'System',
    description: 'Platform announcements and account alerts',
  },
];

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-[#FFD700]' : 'bg-[rgba(255,255,255,0.2)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SkeletonToggle() {
  return (
    <div className="h-6 w-11 rounded-full bg-[rgba(255,255,255,0.08)] animate-pulse" />
  );
}

export function NotificationsSection() {
  const { user } = useAuth();
  const { preferences, updatePreference, loading } = useNotificationPreferences(user?.uid);
  const { enabled: soundEnabled, setSoundEnabled, hydrated: soundHydrated } = useNotificationSound();

  // Preview the chime when the user flips the toggle ON so they know
  // what it sounds like. Ref-based so we don't remount the Audio on
  // every render.
  const previewAudioRef = useRef(null);
  const handleSoundToggle = useCallback((next) => {
    setSoundEnabled(next);
    if (next && typeof window !== 'undefined') {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio('/sounds/notification.mp3');
        previewAudioRef.current.volume = 0.6;
      }
      try {
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [setSoundEnabled]);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="w-1 h-5 bg-yellow-500 rounded-full flex-shrink-0" />
        <Bell className="w-5 h-5 text-[#A0A0A0]" />
        <h3 className="text-lg font-bold text-white">Notifications</h3>
      </div>
      <p className="text-sm text-[#A0A0A0] mb-6">
        Choose which notifications you receive and how.
      </p>

      {/* Notification Sound Toggle — device-level preference, stored in
          localStorage so a user can have sound on their phone but off
          on their office desktop. */}
      <div className="flex items-center justify-between py-3 mb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-start gap-3">
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-[#FFD700] mt-0.5 flex-shrink-0" />
          ) : (
            <VolumeX className="w-5 h-5 text-[#A0A0A0] mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-white">Notification Sound</p>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Play a short chime when a new notification arrives on this device.
            </p>
          </div>
        </div>
        <Toggle
          enabled={soundEnabled}
          onChange={handleSoundToggle}
          disabled={!soundHydrated}
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center mb-3 px-1">
        <div /> {/* category label column */}
        <span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide w-11 text-center">
          Email
        </span>
        <span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide w-11 text-center">
          Push
        </span>
      </div>

      {/* Category rows */}
      <div className="space-y-4">
        {CATEGORIES.map(({ key, label, description }) => (
          <div
            key={key}
            className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center py-3 border-t border-[rgba(255,255,255,0.06)]"
          >
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-[#A0A0A0] mt-0.5">{description}</p>
            </div>

            {/* Email toggle */}
            <div className="flex justify-center">
              {loading ? (
                <SkeletonToggle />
              ) : (
                <Toggle
                  enabled={preferences[key]?.email ?? true}
                  onChange={(val) => updatePreference(key, 'email', val)}
                />
              )}
            </div>

            {/* Push toggle */}
            <div className="flex justify-center">
              {loading ? (
                <SkeletonToggle />
              ) : (
                <Toggle
                  enabled={preferences[key]?.push ?? true}
                  onChange={(val) => updatePreference(key, 'push', val)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsSection;
