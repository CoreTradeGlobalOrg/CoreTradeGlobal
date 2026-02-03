/**
 * useTrackEvent Hook
 *
 * Custom event tracking hook with predefined event helpers
 * Use this hook to track specific user actions
 */

'use client';

import { useCallback } from 'react';
import { useAnalytics } from '@/presentation/contexts/AnalyticsContext';

// Predefined event names for consistency
export const ANALYTICS_EVENTS = {
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  VIEW_ITEM: 'view_item',
  SEARCH: 'search',
  CONTACT_SELLER: 'contact_seller',
  CREATE_REQUEST: 'create_request',
  SUBMIT_QUOTE: 'submit_quote',
  VIEW_COMPANY: 'view_company',
  ADD_PRODUCT: 'add_product',
  EDIT_PRODUCT: 'edit_product',
  DELETE_PRODUCT: 'delete_product',
  SEND_MESSAGE: 'send_message',
  DOWNLOAD_DOCUMENT: 'download_document',
};

export function useTrackEvent() {
  const { trackEvent, isEnabled } = useAnalytics();

  // Generic event tracker
  const track = useCallback((eventName, params = {}) => {
    if (!isEnabled) return;
    trackEvent(eventName, params);
  }, [trackEvent, isEnabled]);

  // Sign up event
  const trackSignUp = useCallback((method = 'email') => {
    track(ANALYTICS_EVENTS.SIGN_UP, { method });
  }, [track]);

  // Login event
  const trackLogin = useCallback((method = 'email') => {
    track(ANALYTICS_EVENTS.LOGIN, { method });
  }, [track]);

  // Logout event
  const trackLogout = useCallback(() => {
    track(ANALYTICS_EVENTS.LOGOUT);
  }, [track]);

  // View item/product event
  const trackViewItem = useCallback((itemId, itemName, itemCategory) => {
    track(ANALYTICS_EVENTS.VIEW_ITEM, {
      item_id: itemId,
      item_name: itemName,
      item_category: itemCategory,
    });
  }, [track]);

  // Search event
  const trackSearch = useCallback((searchTerm, resultsCount) => {
    track(ANALYTICS_EVENTS.SEARCH, {
      search_term: searchTerm,
      results_count: resultsCount,
    });
  }, [track]);

  // Contact seller event
  const trackContactSeller = useCallback((sellerId, productId) => {
    track(ANALYTICS_EVENTS.CONTACT_SELLER, {
      seller_id: sellerId,
      product_id: productId,
    });
  }, [track]);

  // Create RFQ request event
  const trackCreateRequest = useCallback((requestId, categoryId) => {
    track(ANALYTICS_EVENTS.CREATE_REQUEST, {
      request_id: requestId,
      category_id: categoryId,
    });
  }, [track]);

  // Submit quote event
  const trackSubmitQuote = useCallback((requestId, quoteAmount) => {
    track(ANALYTICS_EVENTS.SUBMIT_QUOTE, {
      request_id: requestId,
      quote_amount: quoteAmount,
    });
  }, [track]);

  // View company event
  const trackViewCompany = useCallback((companyId, companyName) => {
    track(ANALYTICS_EVENTS.VIEW_COMPANY, {
      company_id: companyId,
      company_name: companyName,
    });
  }, [track]);

  // Add product event
  const trackAddProduct = useCallback((productId, categoryId) => {
    track(ANALYTICS_EVENTS.ADD_PRODUCT, {
      product_id: productId,
      category_id: categoryId,
    });
  }, [track]);

  // Send message event
  const trackSendMessage = useCallback((recipientId, messageType = 'text') => {
    track(ANALYTICS_EVENTS.SEND_MESSAGE, {
      recipient_id: recipientId,
      message_type: messageType,
    });
  }, [track]);

  // Download document event
  const trackDownloadDocument = useCallback((documentType, documentId) => {
    track(ANALYTICS_EVENTS.DOWNLOAD_DOCUMENT, {
      document_type: documentType,
      document_id: documentId,
    });
  }, [track]);

  return {
    track,
    trackSignUp,
    trackLogin,
    trackLogout,
    trackViewItem,
    trackSearch,
    trackContactSeller,
    trackCreateRequest,
    trackSubmitQuote,
    trackViewCompany,
    trackAddProduct,
    trackSendMessage,
    trackDownloadDocument,
    isEnabled,
    ANALYTICS_EVENTS,
  };
}

export default useTrackEvent;
