/**
 * Contract Constants
 *
 * Enums and configuration for the dual-party contract approval flow.
 * Used by client-side UI and domain entities.
 *
 * Note: Cloud Functions duplicate these as plain CJS objects since
 *       they cannot import ESM from the Next.js app.
 */

import { PAYMENT_TERMS } from '@/core/constants/dealConstants';
import { INCOTERMS_2020 } from '@/core/constants/incoterms';

// ─────────────────────────────────────────────────────────────────────────────
// Contract Status Enum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contract approval status enum.
 * Tracks the overall approval state across both parties.
 */
export const CONTRACT_STATUS = {
  PENDING: 'pending',               // Neither party has submitted yet
  BUYER_APPROVED: 'buyer_approved',   // Buyer submitted; seller pending
  SELLER_APPROVED: 'seller_approved', // Seller submitted; buyer pending
  BOTH_APPROVED: 'both_approved',     // Both parties submitted — deal advances to contract_approved
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Terms Labels (lookup map for display)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps payment term values to their display labels.
 * Built from PAYMENT_TERMS array in dealConstants.js.
 * @type {Record<string, string>}
 */
export const PAYMENT_TERMS_LABELS = PAYMENT_TERMS.reduce((acc, { value, label }) => {
  acc[value] = label;
  return acc;
}, {});

// ─────────────────────────────────────────────────────────────────────────────
// Incoterm Required Documents (ICC Incoterms 2020)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps each Incoterm code to the list of required shipping/trade documents.
 * Based on ICC Incoterms 2020 publication.
 * @type {Record<string, string[]>}
 */
export const INCOTERM_REQUIRED_DOCUMENTS = {
  EXW: ['Commercial Invoice', 'Packing List'],
  FCA: ['Commercial Invoice', 'Packing List', 'Export License (if applicable)'],
  FOB: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Export License'],
  CFR: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Export License'],
  CIF: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Insurance Certificate', 'Export License'],
  CPT: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License'],
  CIP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Insurance Certificate', 'Export License'],
  DAP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License'],
  DPU: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License'],
  DDP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Import Customs Documents', 'Export License'],
  FAS: ['Commercial Invoice', 'Packing List', 'Export License'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Clause Sections (ordered)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered array of contract clause section metadata.
 * Drives the display order and grouping in the contract review UI.
 */
export const CLAUSE_SECTIONS = [
  { id: 'trade_terms', title: 'Trade Terms' },
  { id: 'delivery', title: 'Delivery & Shipping' },
  { id: 'payment', title: 'Payment' },
  { id: 'insurance', title: 'Insurance & Risk' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Build Contract Clauses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates the contract clauses array from an accepted offer.
 *
 * Each clause has: { id, section, sectionTitle, title, value, sourceLabel }
 *
 * @param {Object} offer - Accepted offer document data
 * @param {Object} deal  - Parent deal document data (Deal entity or plain object)
 * @returns {Object[]} Array of 8 clause objects
 */
export function buildContractClauses(offer, deal) {
  const incoterm = INCOTERMS_2020.find((t) => t.code === offer.incoterm);
  const incotermDescription = incoterm ? incoterm.description : offer.incoterm;

  const currency = offer.currency || 'USD';
  const unit = offer.unit || '';
  const price = offer.price || 0;
  const quantity = offer.quantity || 0;

  // Format price with currency
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);

  // Format total value
  const totalValue = offer.estimatedTotal || price * quantity;
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(totalValue);

  // Format delivery deadline
  let deliveryDeadlineValue = 'To be agreed';
  if (offer.deliveryDeadline) {
    try {
      const date = offer.deliveryDeadline?.toDate
        ? offer.deliveryDeadline.toDate()
        : new Date(offer.deliveryDeadline);
      deliveryDeadlineValue = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      deliveryDeadlineValue = String(offer.deliveryDeadline);
    }
  }

  // Insurance clause text
  const insurancePref = offer.insurancePreference;
  let insuranceValue;
  if (insurancePref === 'seller_provides') {
    insuranceValue = 'Seller provides cargo insurance';
  } else if (insurancePref === 'buyer_provides') {
    insuranceValue = 'Buyer provides cargo insurance';
  } else {
    insuranceValue = 'No insurance required (per Incoterm default)';
  }

  return [
    {
      id: 'price',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Unit Price',
      value: `${formattedPrice} per ${unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'quantity',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Quantity',
      value: `${quantity} ${unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'total_value',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Total Contract Value',
      value: formattedTotal,
      sourceLabel: 'Calculated from price x quantity',
    },
    {
      id: 'incoterm',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Incoterm',
      value: `${offer.incoterm} — ${incotermDescription}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'named_place',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Named Place',
      value: offer.namedPlace || 'To be agreed',
      sourceLabel: 'From negotiation',
    },
    {
      id: 'delivery_deadline',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Delivery Deadline',
      value: deliveryDeadlineValue,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'payment_terms',
      section: 'payment',
      sectionTitle: 'Payment',
      title: 'Payment Terms',
      value: PAYMENT_TERMS_LABELS[offer.paymentTerms] || offer.paymentTerms || 'To be agreed',
      sourceLabel: 'From negotiation',
    },
    {
      id: 'insurance',
      section: 'insurance',
      sectionTitle: 'Insurance & Risk',
      title: 'Insurance Responsibility',
      value: insuranceValue,
      sourceLabel: 'From Incoterm default',
    },
  ];
}

export default {
  CONTRACT_STATUS,
  PAYMENT_TERMS_LABELS,
  INCOTERM_REQUIRED_DOCUMENTS,
  CLAUSE_SECTIONS,
  buildContractClauses,
};
