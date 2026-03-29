/**
 * OrderTimeline Component
 *
 * Vertical milestone timeline merging three categories:
 *   1. Deal milestones (from deal.statusHistory)
 *   2. Shipment milestones (from shipmentUpdates)
 *   3. Insurance milestone (coverage_active in shipmentUpdates)
 *
 * Clickable deal milestones navigate to relevant deal sub-pages.
 * Legacy deals without statusHistory show inferred milestones with "(estimated)".
 *
 * Props:
 *   deal            {import('@/domain/entities/Deal').Deal}          - Deal entity
 *   shipmentUpdates {import('@/domain/entities/ShipmentUpdate').ShipmentUpdate[]} - Shipment updates array
 *   dealId          {string}                                          - Deal Firestore ID
 */

'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Anchor, ShieldCheck, FileText, Package } from 'lucide-react';
import { DEAL_STATUS } from '@/core/constants/dealConstants';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_LABELS } from '@/core/constants/shipmentConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a Firestore Timestamp or plain Date to milliseconds.
 * @param {*} value
 * @returns {number}
 */
function toMs(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
}

/**
 * Format a timestamp value as a readable date string.
 * @param {*} value
 * @returns {string}
 */
function formatDate(value) {
  const ms = toMs(value);
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal milestone configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Maps deal status value -> display label */
const DEAL_MILESTONE_LABELS = {
  [DEAL_STATUS.NEGOTIATING]: 'Deal Created',
  [DEAL_STATUS.ACCEPTED]: 'Offer Accepted',
  [DEAL_STATUS.CONTRACT_APPROVED]: 'Contract Approved',
  [DEAL_STATUS.PROVIDERS_SELECTED]: 'Providers Selected',
  [DEAL_STATUS.DELIVERED]: 'Trade Delivered',
};

/**
 * Returns a path to navigate to when a deal milestone is clicked, or null.
 * @param {string} status
 * @param {string} dealId
 * @returns {string|null}
 */
function getDealMilestoneLink(status, dealId) {
  if (status === DEAL_STATUS.ACCEPTED || status === DEAL_STATUS.CONTRACT_APPROVED) {
    return `/deals/${dealId}/contract`;
  }
  if (status === DEAL_STATUS.PROVIDERS_SELECTED) {
    return `/deals/${dealId}/quotes`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build deal milestones from deal.statusHistory.
 * Falls back to inferred milestones from deal timestamps when statusHistory is absent.
 */
function buildDealMilestones(deal, dealId) {
  const history = deal?.statusHistory;

  if (Array.isArray(history) && history.length > 0) {
    return history
      .filter((entry) => DEAL_MILESTONE_LABELS[entry.status])
      .map((entry) => ({
        id: `deal-${entry.status}`,
        category: 'deal',
        label: DEAL_MILESTONE_LABELS[entry.status],
        timestamp: entry.timestamp,
        actor: entry.actorName || null,
        note: null,
        isEstimated: false,
        link: getDealMilestoneLink(entry.status, dealId),
      }));
  }

  // ── Legacy inference ──────────────────────────────────────────────────────
  const inferred = [];

  if (deal?.createdAt) {
    inferred.push({
      id: 'deal-negotiating',
      category: 'deal',
      label: 'Deal Created',
      timestamp: deal.createdAt,
      actor: null,
      note: '(estimated)',
      isEstimated: true,
      link: null,
    });
  }

  const laterStatuses = [
    DEAL_STATUS.ACCEPTED,
    DEAL_STATUS.CONTRACT_APPROVED,
    DEAL_STATUS.PROVIDERS_SELECTED,
    DEAL_STATUS.DELIVERED,
  ];

  const currentIdx = laterStatuses.indexOf(deal?.status);
  if (currentIdx >= 0) {
    laterStatuses.slice(0, currentIdx + 1).forEach((status) => {
      inferred.push({
        id: `deal-${status}`,
        category: 'deal',
        label: DEAL_MILESTONE_LABELS[status],
        timestamp: deal.updatedAt || deal.createdAt,
        actor: null,
        note: '(estimated)',
        isEstimated: true,
        link: getDealMilestoneLink(status, dealId),
      });
    });
  }

  return inferred;
}

/**
 * Build shipment milestones from shipmentUpdates (non-insurance).
 */
function buildShipmentMilestones(shipmentUpdates) {
  return shipmentUpdates
    .filter(
      (u) =>
        u.status !== SHIPMENT_STATUS.COVERAGE_ACTIVE &&
        SHIPMENT_STATUS_LABELS[u.status]
    )
    .map((u) => ({
      id: `shipment-${u.id || u.status}`,
      category: 'shipment',
      label: SHIPMENT_STATUS_LABELS[u.status],
      timestamp: u.timestamp,
      actor: u.actorName || null,
      note: u.note || null,
      isEstimated: false,
      link: null,
    }));
}

/**
 * Build insurance milestone from shipmentUpdates.
 */
function buildInsuranceMilestones(shipmentUpdates) {
  const coverage = shipmentUpdates.find(
    (u) => u.providerType === 'insurance' && u.status === SHIPMENT_STATUS.COVERAGE_ACTIVE
  );
  if (!coverage) return [];
  return [
    {
      id: 'insurance-coverage',
      category: 'insurance',
      label: 'Coverage Active',
      timestamp: coverage.timestamp,
      actor: coverage.actorName || null,
      note: null,
      isEstimated: false,
      link: null,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending future milestones
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine which shipment statuses are still in the future based on current status.
 */
const SHIPMENT_ORDER = [
  SHIPMENT_STATUS.PREPARING,
  SHIPMENT_STATUS.PICKED_UP,
  SHIPMENT_STATUS.IN_TRANSIT,
  SHIPMENT_STATUS.AT_CUSTOMS,
  SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  SHIPMENT_STATUS.DELIVERED,
];

function buildPendingShipmentMilestones(shipmentUpdates) {
  const completedStatuses = new Set(shipmentUpdates.map((u) => u.status));
  const lastCompleted = [...SHIPMENT_ORDER].reverse().find((s) => completedStatuses.has(s));
  if (!lastCompleted) return [];

  const lastIdx = SHIPMENT_ORDER.indexOf(lastCompleted);
  return SHIPMENT_ORDER.slice(lastIdx + 1).map((status) => ({
    id: `pending-${status}`,
    category: 'pending',
    label: SHIPMENT_STATUS_LABELS[status],
    timestamp: null,
    actor: null,
    note: null,
    isEstimated: false,
    link: null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone icon
// ─────────────────────────────────────────────────────────────────────────────

function MilestoneIcon({ category, isPending }) {
  if (isPending) return <Circle className="w-4 h-4 text-[#3A4B62]" />;

  if (category === 'insurance') return <ShieldCheck className="w-4 h-4 text-blue-400" />;
  if (category === 'deal') return <FileText className="w-4 h-4 text-[#FFD700]" />;
  if (category === 'shipment') return <Package className="w-4 h-4 text-emerald-400" />;

  return <CheckCircle2 className="w-4 h-4 text-[#FFD700]" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single milestone row
// ─────────────────────────────────────────────────────────────────────────────

function MilestoneRow({ milestone, isLast, onClick }) {
  const isPending = milestone.category === 'pending';
  const isClickable = !!milestone.link && !isPending;

  const rowClass = [
    'flex gap-3 group',
    isClickable ? 'cursor-pointer' : '',
  ].join(' ');

  return (
    <div className={rowClass} onClick={isClickable ? onClick : undefined} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined}>
      {/* Connector column */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isPending
            ? 'bg-[#0F1C2E] border-2 border-[#2A3B52]'
            : milestone.category === 'deal'
            ? 'bg-[#FFD700]/10 border-2 border-[#FFD700]/40'
            : milestone.category === 'insurance'
            ? 'bg-blue-900/20 border-2 border-blue-700/40'
            : 'bg-emerald-900/20 border-2 border-emerald-700/40'
        }`}>
          <MilestoneIcon category={milestone.category} isPending={isPending} />
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 my-1 ${isPending ? 'bg-[#2A3B52]' : 'bg-[#3A4B62]'}`}
            style={{ minHeight: '20px' }}
          />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 min-w-0 flex-1 ${isClickable ? 'group-hover:opacity-80' : ''}`}>
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${
            isPending ? 'text-[#4A5B6E]' : 'text-white'
          }`}>
            {milestone.label}
          </span>
          {milestone.isEstimated && (
            <span className="text-[10px] text-[#6A7B8E] italic">{milestone.note}</span>
          )}
          {isClickable && (
            <span className="text-[10px] text-[#FFD700]/60 ml-auto">View &rarr;</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {milestone.timestamp && (
            <span className="text-[11px] text-[#6A7B8E]">{formatDate(milestone.timestamp)}</span>
          )}
          {milestone.actor && (
            <span className="text-[11px] text-[#8899AA]">by {milestone.actor}</span>
          )}
        </div>

        {milestone.note && !milestone.isEstimated && (
          <p className="text-[11px] text-[#8899AA] mt-0.5 truncate">{milestone.note}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderTimeline
// ─────────────────────────────────────────────────────────────────────────────

export function OrderTimeline({ deal, shipmentUpdates = [], dealId }) {
  const router = useRouter();

  if (!deal) return null;

  // Build all milestone arrays
  const dealMilestones = buildDealMilestones(deal, dealId);
  const shipmentMilestones = buildShipmentMilestones(shipmentUpdates);
  const insuranceMilestones = buildInsuranceMilestones(shipmentUpdates);
  const pendingMilestones = buildPendingShipmentMilestones(shipmentUpdates);

  // Merge completed milestones and sort by timestamp ascending
  const completedMilestones = [
    ...dealMilestones,
    ...shipmentMilestones,
    ...insuranceMilestones,
  ].sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));

  // Pending milestones come after all completed ones, in natural order
  const allMilestones = [...completedMilestones, ...pendingMilestones];

  if (allMilestones.length === 0) {
    return (
      <p className="text-xs text-[#6A7B8E] text-center py-4">No milestones yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {allMilestones.map((milestone, index) => (
        <MilestoneRow
          key={milestone.id}
          milestone={milestone}
          isLast={index === allMilestones.length - 1}
          onClick={() => {
            if (milestone.link) router.push(milestone.link);
          }}
        />
      ))}
    </div>
  );
}

export default OrderTimeline;
