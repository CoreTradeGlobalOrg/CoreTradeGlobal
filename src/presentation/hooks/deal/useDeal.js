/**
 * useDeal Hook
 *
 * Real-time subscription to a single deal and its offers subcollection.
 * Follows the MessagesContext.jsx pattern for onSnapshot subscriptions.
 *
 * Also plays a subtle notification chime when a new offer arrives from the other party
 * (but NOT for the current user's own offers, and NOT when the tab is hidden).
 *
 * Usage:
 * const { deal, offers, loading, error } = useDeal(dealId);
 */

import { useState, useEffect, useRef } from 'react';
import { container } from '@/core/di/container';

// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API notification chime (no external file required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Play a short, subtle two-tone chime using the Web Audio API.
 * Only plays when the document is visible and on supported browsers.
 */
function playNotificationChime() {
  if (typeof window === 'undefined') return;
  if (document.hidden) return; // Tab is in background — skip

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // First tone: higher pitch
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second tone: lower pitch (slight delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.15); // E5
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);

    // Auto-close context after chime
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Audio API may be blocked by autoplay policy — silently ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDeal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a deal and its offer timeline in real time.
 *
 * @param {string|null} dealId - Firestore deal document ID
 * @param {string|null} currentUserUid - Current user's UID (for sound exclusion)
 * @returns {{ deal: import('@/domain/entities/Deal').Deal|null, offers: import('@/domain/entities/Offer').Offer[], loading: boolean, error: string|null }}
 */
export function useDeal(dealId, currentUserUid = null) {
  const [deal, setDeal] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track previous offer count and IDs for notification sound
  const prevOfferIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    isFirstLoadRef.current = true;

    const dealRepository = container.getDealRepository();
    const offerRepository = container.getOfferRepository();

    let dealLoaded = false;
    let offersLoaded = false;

    function checkLoaded() {
      if (dealLoaded && offersLoaded) {
        setLoading(false);
      }
    }

    // Subscribe to deal document
    const unsubDeal = dealRepository.subscribeToDeal(dealId, (dealEntity) => {
      setDeal(dealEntity);
      dealLoaded = true;
      checkLoaded();
    });

    // Subscribe to offers subcollection (ordered by round ascending)
    const unsubOffers = offerRepository.subscribeToOffers(dealId, (offerEntities) => {
      // Detect new offers from the other party → play notification sound
      if (!isFirstLoadRef.current) {
        const newOffers = offerEntities.filter(
          (o) => !prevOfferIdsRef.current.has(o.id)
        );

        for (const newOffer of newOffers) {
          // Only play sound if the new offer was submitted by someone else
          if (currentUserUid && newOffer.submittedBy !== currentUserUid) {
            playNotificationChime();
            break; // Play once even if multiple new offers arrive
          }
        }
      }

      // Update known offer IDs
      prevOfferIdsRef.current = new Set(offerEntities.map((o) => o.id));
      isFirstLoadRef.current = false;

      setOffers(offerEntities);
      offersLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubDeal();
      unsubOffers();
    };
  }, [dealId, currentUserUid]);

  return { deal, offers, loading, error };
}

export default useDeal;
