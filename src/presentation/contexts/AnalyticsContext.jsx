/**
 * Analytics Context
 *
 * Provides Firebase Analytics integration with cookie consent support
 * Handles page views, custom events, and time on page tracking
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  initializeAnalytics,
  getAnalyticsInstance,
  logEvent,
  setUserId,
  setUserProperties,
} from '@/core/config/firebase.config';

const COOKIE_CONSENT_KEY = 'cookie_consent';

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pageStartTime = useRef(null);
  const currentPage = useRef(null);

  // Check cookie consent and initialize analytics
  const checkConsentAndInit = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setIsEnabled(false);
        return;
      }

      const prefs = JSON.parse(consent);
      if (prefs.analytics) {
        const analytics = await initializeAnalytics();
        if (analytics) {
          setIsEnabled(true);
          setIsInitialized(true);
        }
      } else {
        setIsEnabled(false);
      }
    } catch (e) {
      console.error('Analytics initialization error:', e);
      setIsEnabled(false);
    }
  }, []);

  // Initialize on mount and listen for consent changes
  useEffect(() => {
    checkConsentAndInit();

    const handleConsentChange = (event) => {
      if (event.detail?.analytics) {
        checkConsentAndInit();
      } else {
        setIsEnabled(false);
      }
    };

    window.addEventListener('consentChanged', handleConsentChange);
    return () => window.removeEventListener('consentChanged', handleConsentChange);
  }, [checkConsentAndInit]);

  // Track page view
  const trackPageView = useCallback((pagePath, pageTitle) => {
    if (!isEnabled) return;

    const analytics = getAnalyticsInstance();
    if (!analytics) return;

    // Track time on previous page
    if (pageStartTime.current && currentPage.current) {
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      if (timeOnPage > 0 && timeOnPage < 3600) {
        logEvent(analytics, 'time_on_page', {
          page_path: currentPage.current,
          time_seconds: timeOnPage,
        });
      }
    }

    // Track new page view
    logEvent(analytics, 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });

    // Reset timer for new page
    pageStartTime.current = Date.now();
    currentPage.current = pagePath;
  }, [isEnabled]);

  // Track custom event
  const trackEvent = useCallback((eventName, params = {}) => {
    if (!isEnabled) return;

    const analytics = getAnalyticsInstance();
    if (!analytics) return;

    logEvent(analytics, eventName, params);
  }, [isEnabled]);

  // Track time on page (for manual calls)
  const trackTimeOnPage = useCallback((pagePath, timeSeconds) => {
    if (!isEnabled) return;

    const analytics = getAnalyticsInstance();
    if (!analytics) return;

    logEvent(analytics, 'time_on_page', {
      page_path: pagePath,
      time_seconds: timeSeconds,
    });
  }, [isEnabled]);

  // Set user ID for tracking
  const setAnalyticsUserId = useCallback((userId) => {
    if (!isEnabled) return;

    const analytics = getAnalyticsInstance();
    if (!analytics) return;

    if (userId) {
      setUserId(analytics, userId);
    }
  }, [isEnabled]);

  // Set user properties
  const setAnalyticsUserProperties = useCallback((properties) => {
    if (!isEnabled) return;

    const analytics = getAnalyticsInstance();
    if (!analytics) return;

    setUserProperties(analytics, properties);
  }, [isEnabled]);

  // Track time when user leaves page
  useEffect(() => {
    if (!isEnabled) return;

    const handleBeforeUnload = () => {
      if (pageStartTime.current && currentPage.current) {
        const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
        if (timeOnPage > 0 && timeOnPage < 3600) {
          const analytics = getAnalyticsInstance();
          if (analytics) {
            logEvent(analytics, 'time_on_page', {
              page_path: currentPage.current,
              time_seconds: timeOnPage,
            });
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEnabled]);

  const value = {
    isEnabled,
    isInitialized,
    trackPageView,
    trackEvent,
    trackTimeOnPage,
    setUserId: setAnalyticsUserId,
    setUserProperties: setAnalyticsUserProperties,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

export default AnalyticsContext;
