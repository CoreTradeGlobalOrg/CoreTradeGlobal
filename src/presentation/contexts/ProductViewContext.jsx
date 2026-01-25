/**
 * ProductViewContext
 *
 * Context for tracking product views by unauthenticated users
 * Implements the 3-product view limit for non-registered users
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'ctg_viewed_products';
const VIEW_LIMIT = 3;

const ProductViewContext = createContext(null);

export function ProductViewProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [viewedProductIds, setViewedProductIds] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load viewed products from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setViewedProductIds(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading viewed products from localStorage:', error);
      }
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever viewedProductIds changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedProductIds));
      } catch (error) {
        console.error('Error saving viewed products to localStorage:', error);
      }
    }
  }, [viewedProductIds, isInitialized]);

  // Clear viewed products when user logs in
  useEffect(() => {
    if (isAuthenticated && viewedProductIds.length > 0) {
      setViewedProductIds([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isAuthenticated]);

  /**
   * Check if user has already viewed a product
   */
  const hasViewedProduct = useCallback((productId) => {
    return viewedProductIds.includes(productId);
  }, [viewedProductIds]);

  /**
   * Check if user can view more products
   * Authenticated users always can view more
   */
  const canViewMore = useCallback(() => {
    if (isAuthenticated) return true;
    return viewedProductIds.length < VIEW_LIMIT;
  }, [isAuthenticated, viewedProductIds]);

  /**
   * Get remaining free views
   */
  const remainingViews = useCallback(() => {
    if (isAuthenticated) return Infinity;
    return Math.max(0, VIEW_LIMIT - viewedProductIds.length);
  }, [isAuthenticated, viewedProductIds]);

  /**
   * Record a product view
   * Returns true if view was recorded, false if limit reached
   */
  const recordView = useCallback((productId) => {
    // Authenticated users don't need to track
    if (isAuthenticated) return true;

    // Already viewed this product
    if (viewedProductIds.includes(productId)) return true;

    // Check if limit reached
    if (viewedProductIds.length >= VIEW_LIMIT) {
      return false;
    }

    // Record the view
    setViewedProductIds(prev => [...prev, productId]);
    return true;
  }, [isAuthenticated, viewedProductIds]);

  /**
   * Check if user can view a specific product
   * Returns true if:
   * - User is authenticated
   * - User has already viewed this product
   * - User hasn't reached the limit
   */
  const canViewProduct = useCallback((productId) => {
    if (isAuthenticated) return true;
    if (viewedProductIds.includes(productId)) return true;
    return viewedProductIds.length < VIEW_LIMIT;
  }, [isAuthenticated, viewedProductIds]);

  /**
   * Check if limit is reached
   */
  const isLimitReached = useCallback(() => {
    if (isAuthenticated) return false;
    return viewedProductIds.length >= VIEW_LIMIT;
  }, [isAuthenticated, viewedProductIds]);

  /**
   * Reset viewed products (for testing)
   */
  const resetViews = useCallback(() => {
    setViewedProductIds([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = {
    // State
    viewedProductIds,
    isInitialized,
    viewLimit: VIEW_LIMIT,

    // Computed
    isAuthenticated,
    authLoading,

    // Methods
    hasViewedProduct,
    canViewMore,
    remainingViews,
    recordView,
    canViewProduct,
    isLimitReached,
    resetViews,
  };

  return (
    <ProductViewContext.Provider value={value}>
      {children}
    </ProductViewContext.Provider>
  );
}

export function useProductView() {
  const context = useContext(ProductViewContext);
  if (!context) {
    throw new Error('useProductView must be used within a ProductViewProvider');
  }
  return context;
}

export default ProductViewContext;
