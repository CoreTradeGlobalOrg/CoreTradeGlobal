/**
 * useTradeSummary Hook
 *
 * Multi-source aggregation hook for the Trade Summary tab.
 * Subscribes in parallel to: deal, contract, quotes (for provider details),
 * shipment updates, and the current user's legal engagement.
 *
 * Also fetches buyer and seller display names from UserRepository when the deal
 * document provides buyerId and sellerId.
 *
 * Loading pattern: closure flags — sets loading=false only when ALL
 * parallel subscriptions have fired at least once (prevents partial-data render).
 *
 * Usage:
 * const { deal, contract, selectedInsuranceQuote, selectedLogisticsQuote,
 *         shipmentUpdates, latestShipment, legalEngagement,
 *         buyerName, sellerName, loading, error }
 *   = useTradeSummary(dealId, currentUserUid);
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';
import { QUOTE_STATUS } from '@/core/constants/quoteConstants';

/**
 * Aggregate trade summary data from multiple Firestore sources.
 *
 * @param {string|null} dealId - Firestore deal document ID
 * @param {string|null} currentUserUid - Current user's UID
 * @returns {{
 *   deal: import('@/domain/entities/Deal').Deal|null,
 *   contract: import('@/domain/entities/Contract').Contract|null,
 *   selectedInsuranceQuote: import('@/domain/entities/Quote').Quote|null,
 *   selectedLogisticsQuote: import('@/domain/entities/Quote').Quote|null,
 *   shipmentUpdates: import('@/domain/entities/ShipmentUpdate').ShipmentUpdate[],
 *   latestShipment: import('@/domain/entities/ShipmentUpdate').ShipmentUpdate|null,
 *   legalEngagement: import('@/domain/entities/LegalEngagement').LegalEngagement|null,
 *   buyerName: string|null,
 *   sellerName: string|null,
 *   loading: boolean,
 *   error: string|null,
 * }}
 */
export function useTradeSummary(dealId, currentUserUid) {
  const [deal, setDeal] = useState(null);
  const [contract, setContract] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [shipmentUpdates, setShipmentUpdates] = useState([]);
  const [legalEngagement, setLegalEngagement] = useState(null);
  const [buyerName, setBuyerName] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId || !currentUserUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const dealRepo = container.getDealRepository();
    const contractRepo = container.getContractRepository();
    const quoteRepo = container.getQuoteRepository();
    const shipmentRepo = container.getShipmentRepository();
    const legalRepo = container.getLegalEngagementRepository();

    // Closure flags — loading stays true until ALL have fired at least once
    let dealLoaded = false;
    let contractLoaded = false;
    let quotesLoaded = false;
    let shipmentsLoaded = false;
    let legalLoaded = false;

    function checkAllLoaded() {
      if (dealLoaded && contractLoaded && quotesLoaded && shipmentsLoaded && legalLoaded) {
        setLoading(false);
      }
    }

    // 1. Subscribe to deal document
    const unsubDeal = dealRepo.subscribeToDeal(
      dealId,
      (dealEntity) => {
        setDeal(dealEntity);
        dealLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('useTradeSummary deal error:', err);
        dealLoaded = true;
        setError('Unable to load some trade summary data');
        checkAllLoaded();
      }
    );

    // 2. Subscribe to contract document
    const unsubContract = contractRepo.subscribeToContract(
      dealId,
      (contractEntity) => {
        setContract(contractEntity);
        contractLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('useTradeSummary contract error:', err);
        contractLoaded = true;
        setError('Unable to load some trade summary data');
        checkAllLoaded();
      }
    );

    // 3. Subscribe to all provider quotes for this deal (to find selected ones)
    const unsubQuotes = quoteRepo.subscribeToQuotesForDeal(
      dealId,
      (quoteList) => {
        setQuotes(quoteList);
        quotesLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('useTradeSummary quotes error:', err);
        quotesLoaded = true;
        checkAllLoaded();
      }
    );

    // 4. Subscribe to shipment updates
    const unsubShipment = shipmentRepo.subscribeToShipmentUpdates(
      dealId,
      currentUserUid,
      (updates) => {
        setShipmentUpdates(updates);
        shipmentsLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('useTradeSummary shipments error:', err);
        shipmentsLoaded = true;
        checkAllLoaded();
      }
    );

    // 5. Subscribe to current user's legal engagement for this deal only
    //    CRITICAL: Filter by clientId === currentUserUid — never show opposing party's lawyer
    const unsubLegal = legalRepo.subscribeToEngagementForDeal(
      dealId,
      currentUserUid,
      (engagement) => {
        setLegalEngagement(engagement);
        legalLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('useTradeSummary legal error:', err);
        legalLoaded = true;
        checkAllLoaded();
      }
    );

    return () => {
      unsubDeal();
      unsubContract();
      unsubQuotes();
      unsubShipment();
      unsubLegal();
    };
  }, [dealId, currentUserUid]);

  // Fetch buyer and seller display names from UserRepository when deal IDs are available
  useEffect(() => {
    if (!deal?.buyerId || !deal?.sellerId) return;

    const userRepo = container.getUserRepository();

    userRepo.getById(deal.buyerId).then((user) => {
      setBuyerName(user?.companyName || user?.displayName || 'Buyer');
    }).catch(() => setBuyerName('Buyer'));

    userRepo.getById(deal.sellerId).then((user) => {
      setSellerName(user?.companyName || user?.displayName || 'Seller');
    }).catch(() => setSellerName('Seller'));
  }, [deal?.buyerId, deal?.sellerId]);

  // Derived: find selected insurance and logistics quotes from the quotes list
  const selectedInsuranceQuote = quotes.find(
    (q) => q.providerType === 'insurance' && q.status === QUOTE_STATUS.ACCEPTED
  ) || null;

  const selectedLogisticsQuote = quotes.find(
    (q) => q.providerType === 'logistics' && q.status === QUOTE_STATUS.ACCEPTED
  ) || null;

  // Derived: latest shipment update (last item since they are ordered ASC)
  const latestShipment = shipmentUpdates.length > 0
    ? shipmentUpdates[shipmentUpdates.length - 1]
    : null;

  return {
    deal,
    contract,
    selectedInsuranceQuote,
    selectedLogisticsQuote,
    shipmentUpdates,
    latestShipment,
    legalEngagement,
    buyerName,
    sellerName,
    loading,
    error,
  };
}

export default useTradeSummary;
