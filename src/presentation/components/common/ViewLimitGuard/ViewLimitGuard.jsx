'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import Link from 'next/link';
import { Lock, ArrowLeft, Eye } from 'lucide-react';

const VIEW_LIMIT = 3;
const STORAGE_KEY = 'ctg_viewed_items';

/**
 * ViewLimitGuard Component
 *
 * Tracks viewed items and enforces a view limit for non-authenticated users.
 * After VIEW_LIMIT unique items, blurs the content with a register prompt overlay.
 */
export function ViewLimitGuard({ itemId, itemType = 'product', children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip check if user is authenticated
    if (loading) return;

    if (isAuthenticated) {
      setIsBlocked(false);
      setChecking(false);
      return;
    }

    // Get viewed items from localStorage
    const getViewedItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    // Save viewed items to localStorage
    const saveViewedItems = (items) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // localStorage might be full or disabled
      }
    };

    const viewedItems = getViewedItems();
    const itemKey = `${itemType}_${itemId}`;

    // Check if this item was already viewed
    const alreadyViewed = viewedItems.includes(itemKey);

    if (alreadyViewed) {
      // Already viewed this item, allow access
      setIsBlocked(false);
      setViewCount(viewedItems.length);
    } else if (viewedItems.length >= VIEW_LIMIT) {
      // Limit reached, block access
      setIsBlocked(true);
      setViewCount(viewedItems.length);
    } else {
      // Add to viewed items
      const newViewedItems = [...viewedItems, itemKey];
      saveViewedItems(newViewedItems);
      setIsBlocked(false);
      setViewCount(newViewedItems.length);
    }

    setChecking(false);
  }, [itemId, itemType, isAuthenticated, loading]);

  // Build redirect URL for login/register
  const redirectUrl = encodeURIComponent(pathname);

  // Store redirect in localStorage when blocked (backup for URL param)
  useEffect(() => {
    if (isBlocked && pathname) {
      localStorage.setItem('ctg_auth_redirect', pathname);
    }
  }, [isBlocked, pathname]);

  // Show loading state
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  // Show blurred content with overlay if blocked
  if (isBlocked) {
    return (
      <div className="relative">
        {/* Blurred content */}
        <div className="blur-md pointer-events-none select-none">
          {children}
        </div>

        {/* Overlay with register prompt */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]/60 z-50">
          <div className="text-center px-6 py-8 max-w-sm">
            <div className="w-14 h-14 bg-[rgba(212,175,55,0.15)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-[#D4AF37]" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Register to View
            </h3>

            <p className="text-[#A0A0A0] text-sm mb-6">
              Create a free account to access all products and requests.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/register?redirect=${redirectUrl}`}
                className="btn-signup"
              >
                Register
              </Link>

              <Link
                href={`/login?redirect=${redirectUrl}`}
                className="px-6 py-2.5 border border-[rgba(255,255,255,0.2)] text-white font-medium rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-all text-sm"
              >
                Login
              </Link>
            </div>

            <button
              onClick={() => router.back()}
              className="mt-4 flex items-center gap-2 text-[#A0A0A0] hover:text-white transition-colors mx-auto text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate remaining views
  const remainingViews = VIEW_LIMIT - viewCount;

  return (
    <>
      {children}
      {/* Bottom-right indicator for non-authenticated users */}
      {!isAuthenticated && remainingViews > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 shadow-xl max-w-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(212,175,55,0.1)] rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {remainingViews} free view{remainingViews !== 1 ? 's' : ''} left
              </p>
              <Link href={`/register?redirect=${redirectUrl}`} className="text-[#D4AF37] text-xs hover:underline">
                Register for unlimited access
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ViewLimitGuard;
