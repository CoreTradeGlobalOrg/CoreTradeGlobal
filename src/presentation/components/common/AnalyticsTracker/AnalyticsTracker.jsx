/**
 * Analytics Tracker Component
 *
 * Wrapper component that handles automatic page tracking
 * Wrapped in Suspense boundary for useSearchParams compatibility
 */

'use client';

import { Suspense, useEffect } from 'react';
import { usePageTracking } from '@/presentation/hooks/analytics/usePageTracking';
import { useAnalytics } from '@/presentation/contexts/AnalyticsContext';
import { useAuth } from '@/presentation/contexts/AuthContext';

function AnalyticsTrackerInner() {
  usePageTracking();

  const { setUserId, setUserProperties, isEnabled } = useAnalytics();
  const { user } = useAuth();

  // Set user ID and properties when user is authenticated
  useEffect(() => {
    if (!isEnabled) return;

    if (user?.uid) {
      setUserId(user.uid);
      setUserProperties({
        user_type: user.role || 'user',
        company_id: user.companyId || null,
      });
    }
  }, [user, isEnabled, setUserId, setUserProperties]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  );
}

export default AnalyticsTracker;
