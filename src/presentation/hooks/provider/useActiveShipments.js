/**
 * useActiveShipments Hook
 *
 * Real-time subscriptions to all quote requests where the provider is selected,
 * enriched with deal and shipment tracking data.
 *
 * Usage (logistics):
 *   const { shipments, loading, error, submitUpdate } = useActiveShipments(uid, 'logistics');
 *
 * Usage (insurance):
 *   const { shipments, loading, error, confirmCoverage } = useActiveShipments(uid, 'insurance');
 *
 * Returns:
 *   shipments: Array of { quoteRequest, deal, latestShipmentUpdate, shipmentUpdates }
 *   loading: boolean
 *   error: string|null
 *   submitUpdate: async (dealId, payload) => void  (logistics only)
 *   confirmCoverage: async (dealId) => void          (insurance only)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';
import { QuoteRequest } from '@/domain/entities/QuoteRequest';
import { ShipmentUpdate } from '@/domain/entities/ShipmentUpdate';

// ─────────────────────────────────────────────────────────────────────────────
// Map user role -> quoteRequests.providerType value stored in Firestore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the quoteRequests.providerType filter value from the provider's role.
 * QuoteRequest.fromFirestore normalizes 'insurance_provider' -> 'insurance'
 * and 'logistics_provider' -> 'logistics' on the entity side, but Firestore
 * docs may store either form. We query on the normalized short form since
 * broadcastQuoteRequests (Plan 04-02) writes the short form.
 *
 * @param {'logistics'|'insurance'|'logistics_provider'|'insurance_provider'} rawType
 * @returns {'logistics'|'insurance'}
 */
function normalizeProviderType(rawType) {
  if (rawType === 'logistics_provider') return 'logistics';
  if (rawType === 'insurance_provider') return 'insurance';
  return rawType; // already short form
}

// ─────────────────────────────────────────────────────────────────────────────
// useActiveShipments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to selected quote requests and enrich each with deal + shipment data.
 *
 * @param {string|null} uid - Authenticated provider UID
 * @param {'logistics'|'insurance'|'logistics_provider'|'insurance_provider'} providerType
 * @returns {{
 *   shipments: Array<{ quoteRequest: QuoteRequest, deal: object|null, latestShipmentUpdate: ShipmentUpdate|null, shipmentUpdates: ShipmentUpdate[] }>,
 *   loading: boolean,
 *   error: string|null,
 *   submitUpdate: Function,
 *   confirmCoverage: Function,
 * }}
 */
export function useActiveShipments(uid, providerType) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Holds per-dealId unsubscribe cleanup fns: { [dealId]: [unsubDeal, unsubTracking?] }
  const perDealUnsubs = useRef({});
  // Main quoteRequests listener unsubscribe
  const mainUnsubRef = useRef(null);
  // Mutable map of enriched shipment data: { [quoteRequestId]: enrichedObj }
  const shipmentsMapRef = useRef({});

  const normalizedType = normalizeProviderType(providerType);

  // ─── flush map -> state ────────────────────────────────────────────────────
  const flushShipments = useCallback(() => {
    setShipments(Object.values(shipmentsMapRef.current));
  }, []);

  // ─── Cleanup all per-deal subscriptions ───────────────────────────────────
  const cleanupPerDealSubs = useCallback((dealId) => {
    const unsubs = perDealUnsubs.current[dealId];
    if (unsubs) {
      unsubs.forEach((fn) => fn());
      delete perDealUnsubs.current[dealId];
    }
  }, []);

  const cleanupAll = useCallback(() => {
    Object.keys(perDealUnsubs.current).forEach(cleanupPerDealSubs);
    if (mainUnsubRef.current) {
      mainUnsubRef.current();
      mainUnsubRef.current = null;
    }
    shipmentsMapRef.current = {};
  }, [cleanupPerDealSubs]);

  // ─── Subscribe per-deal: deal doc + shipmentTracking subcollection ─────────
  const subscribeForQuoteRequest = useCallback(
    (qr) => {
      const dealId = qr.dealId;
      // Avoid duplicate subscriptions
      if (perDealUnsubs.current[qr.id]) return;

      const dealUnsubs = [];

      // 1. Deal doc subscription
      const dealRef = doc(db, 'deals', dealId);
      const unsubDeal = onSnapshot(
        dealRef,
        (snap) => {
          const dealData = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          const existing = shipmentsMapRef.current[qr.id] || {};
          shipmentsMapRef.current[qr.id] = { ...existing, quoteRequest: qr, deal: dealData };
          flushShipments();
        },
        () => {
          // Permission denied is expected — providers aren't deal participants.
          // UI falls back to quoteRequest.dealSnapshot data (productName, buyerName, sellerName).
        }
      );
      dealUnsubs.push(unsubDeal);

      // 2. Shipment tracking subscription (logistics only)
      if (normalizedType === 'logistics') {
        const trackingQ = query(
          collection(db, 'deals', dealId, 'shipmentTracking'),
          where('readers', 'array-contains', uid),
          orderBy('timestamp', 'asc')
        );
        const unsubTracking = onSnapshot(
          trackingQ,
          (snap) => {
            const updates = snap.docs.map((d) =>
              ShipmentUpdate.fromFirestore({ id: d.id, ...d.data() })
            );
            const latestShipmentUpdate = updates.length > 0 ? updates[updates.length - 1] : null;
            const existing = shipmentsMapRef.current[qr.id] || {};
            shipmentsMapRef.current[qr.id] = {
              ...existing,
              quoteRequest: qr,
              shipmentUpdates: updates,
              latestShipmentUpdate,
            };
            flushShipments();
          },
          (err) => {
            console.error('useActiveShipments tracking snapshot error:', err);
          }
        );
        dealUnsubs.push(unsubTracking);
      } else {
        // Insurance: populate with empty shipment data (coverage confirmed via shipmentUpdates)
        const trackingQ = query(
          collection(db, 'deals', dealId, 'shipmentTracking'),
          where('readers', 'array-contains', uid),
          orderBy('timestamp', 'asc')
        );
        const unsubTracking = onSnapshot(
          trackingQ,
          (snap) => {
            const updates = snap.docs.map((d) =>
              ShipmentUpdate.fromFirestore({ id: d.id, ...d.data() })
            );
            const latestShipmentUpdate = updates.length > 0 ? updates[updates.length - 1] : null;
            const existing = shipmentsMapRef.current[qr.id] || {};
            shipmentsMapRef.current[qr.id] = {
              ...existing,
              quoteRequest: qr,
              shipmentUpdates: updates,
              latestShipmentUpdate,
            };
            flushShipments();
          },
          (err) => {
            console.error('useActiveShipments insurance tracking snapshot error:', err);
          }
        );
        dealUnsubs.push(unsubTracking);
      }

      perDealUnsubs.current[qr.id] = dealUnsubs;
    },
    [normalizedType, flushShipments]
  );

  // ─── Main quoteRequests subscription ──────────────────────────────────────
  useEffect(() => {
    cleanupAll();

    if (!uid) {
      setShipments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'quoteRequests'),
      where('providerUid', '==', uid),
      where('status', '==', 'selected'),
      where('providerType', '==', normalizedType)
    );

    const unsubMain = onSnapshot(
      q,
      (snap) => {
        const quoteRequests = snap.docs.map((d) =>
          QuoteRequest.fromFirestore({ id: d.id, ...d.data() })
        );

        // Remove per-deal subs for quote requests that are no longer present
        const currentQrIds = new Set(quoteRequests.map((qr) => qr.id));
        Object.keys(perDealUnsubs.current).forEach((qrId) => {
          if (!currentQrIds.has(qrId)) {
            cleanupPerDealSubs(qrId);
            delete shipmentsMapRef.current[qrId];
          }
        });

        // Add new subscriptions
        quoteRequests.forEach((qr) => subscribeForQuoteRequest(qr));

        setLoading(false);

        // If no results, clear state immediately
        if (quoteRequests.length === 0) {
          shipmentsMapRef.current = {};
          setShipments([]);
        }
      },
      (err) => {
        console.error('useActiveShipments main query error:', err);
        setError(err.message || 'Failed to load active shipments.');
        setLoading(false);
      }
    );

    mainUnsubRef.current = unsubMain;

    return () => {
      cleanupAll();
    };
    // Re-run only when uid or normalizedType changes (providerType is stable per session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, normalizedType]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Submit a shipment status update (logistics providers).
   * Delegates to submitShipmentUpdate Cloud Function.
   *
   * @param {string} dealId
   * @param {{ status: string, note?: string, containerNumber?: string, trackingRef?: string, etaDate?: string }} payload
   */
  const submitUpdate = useCallback(async (dealId, payload) => {
    setActionLoading(true);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'submitShipmentUpdate');
      await fn({ dealId, ...payload });
      toast.success('Shipment status updated');
    } catch (err) {
      const msg = err?.message || 'Failed to submit shipment update';
      toast.error(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  /**
   * Confirm insurance coverage for a deal (insurance providers).
   * Delegates to confirmInsuranceCoverage Cloud Function.
   *
   * @param {string} dealId
   */
  const confirmCoverage = useCallback(async (dealId) => {
    setActionLoading(true);
    try {
      const fn = httpsCallable(getFunctionsInstance(), 'confirmInsuranceCoverage');
      await fn({ dealId });
      toast.success('Insurance coverage confirmed');
    } catch (err) {
      const msg = err?.message || 'Failed to confirm coverage';
      toast.error(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  return {
    shipments,
    loading,
    error,
    actionLoading,
    submitUpdate,
    confirmCoverage,
  };
}

export default useActiveShipments;
