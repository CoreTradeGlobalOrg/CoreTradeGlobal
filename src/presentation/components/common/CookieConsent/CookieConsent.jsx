/**
 * Cookie Consent Banner
 *
 * GDPR/CCPA compliant cookie consent banner
 * With manual cookie selection dialog
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, Settings } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: false,
    analytics: false,
  });

  // Load existing preferences from localStorage
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent) {
      try {
        const saved = JSON.parse(consent);
        setPreferences({
          necessary: true,
          functional: saved.functional ?? false,
          analytics: saved.analytics ?? false,
        });
      } catch (e) {
        // Invalid JSON, show banner
        setShowBanner(true);
      }
    } else {
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for footer "Cookie Settings" click
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    window.addEventListener('openCookieSettings', handleOpenSettings);
    return () => window.removeEventListener('openCookieSettings', handleOpenSettings);
  }, []);

  const savePreferences = (prefs) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true,
      functional: false,
      analytics: false,
    };
    setPreferences(allRejected);
    savePreferences(allRejected);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Main Banner */}
      {showBanner && (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 pointer-events-none">
        <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slideUp {
            animation: slideUp 0.4s ease-out;
          }
        `}</style>

        <div className="max-w-2xl mx-auto pointer-events-auto animate-slideUp">
          <div className="glass-card p-6 border border-[rgba(255,255,255,0.1)] shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                <Cookie className="w-7 h-7 text-[#FFD700]" />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-white font-bold text-lg mb-2">
                  We value your privacy
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We use cookies to enhance your browsing experience, provide personalized content, and analyze our traffic. Please select your preference.{' '}
                  <Link href="/cookie-policy" className="text-[#FFD700] hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={handleRejectAll}
                  className="px-5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.2)] text-white font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm"
                >
                  Reject All
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-5 py-2.5 rounded-xl border border-[#FFD700]/50 text-[#FFD700] font-medium hover:bg-[#FFD700]/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Customize
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all text-sm"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />

          {/* Dialog */}
          <div className="relative glass-card p-6 max-w-lg w-full border border-[rgba(255,255,255,0.1)] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-white font-bold text-xl mb-2">Cookie Preferences</h3>
              <p className="text-gray-400 text-sm">
                Choose which cookies you want to allow. You can change these settings at any time.
              </p>
            </div>

            {/* Cookie Options */}
            <div className="space-y-4">
              {/* Necessary - Always On */}
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Necessary Cookies</span>
                  <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                    Always Active
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Essential for the website to function properly. These cannot be disabled as they handle things like security and session management.
                </p>
              </div>

              {/* Functional */}
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Functional Cookies</span>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, functional: !p.functional }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.functional ? 'bg-[#FFD700]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        preferences.functional ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">
                  Enable enhanced functionality like remembering your preferences, language settings, and personalized features.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Analytics Cookies</span>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.analytics ? 'bg-[#FFD700]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        preferences.analytics ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">
                  Help us understand how visitors interact with our website. This data is used to improve our services and user experience.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleRejectAll}
                className="flex-1 px-5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.2)] text-white font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm"
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all text-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CookieConsent;
