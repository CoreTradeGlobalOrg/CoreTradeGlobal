/**
 * ShipmentUpdateForm Component
 *
 * Form for logistics providers to submit a shipment status update.
 * Enforces forward-only status progression (cannot move backward in the pipeline).
 *
 * Props:
 *   dealId        {string}   - Deal ID to submit update for
 *   currentStatus {string}   - Current SHIPMENT_STATUS value (or null if none yet)
 *   onSubmit      {Function} - async (dealId, payload) => void
 *   loading       {boolean}  - External loading state (disables submit button)
 */

'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_LABELS,
} from '@/core/constants/shipmentConstants';
import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';

// Ordered status progression for logistics (COVERAGE_ACTIVE is insurance-only)
const LOGISTICS_STATUS_ORDER = [
  SHIPMENT_STATUS.PREPARING,
  SHIPMENT_STATUS.PICKED_UP,
  SHIPMENT_STATUS.IN_TRANSIT,
  SHIPMENT_STATUS.AT_CUSTOMS,
  SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  SHIPMENT_STATUS.DELIVERED,
];

/**
 * Returns the index of a status in the logistics order.
 * Returns -1 if not found (e.g., COVERAGE_ACTIVE).
 */
function statusIndex(status) {
  return LOGISTICS_STATUS_ORDER.indexOf(status);
}

/**
 * Whether container number and tracking ref are required.
 * Required on the first physical update (PICKED_UP and beyond) when they haven't been set yet.
 *
 * @param {string} newStatus
 * @param {string|null} currentStatus
 */
function isFirstUpdate(newStatus, currentStatus) {
  // If there's no current status yet, the first update is PREPARING → require on PICKED_UP
  const firstPhysical = SHIPMENT_STATUS.PICKED_UP;
  const newIdx = statusIndex(newStatus);
  const currentIdx = statusIndex(currentStatus || '');

  // Required when transitioning to or beyond PICKED_UP for the first time
  return newIdx >= statusIndex(firstPhysical) && currentIdx < statusIndex(firstPhysical);
}

export function ShipmentUpdateForm({ dealId, currentStatus, onSubmit, loading }) {
  const initialStatus = (() => {
    if (!currentStatus) return SHIPMENT_STATUS.PREPARING;
    const idx = statusIndex(currentStatus);
    // Default to next status in sequence
    const next = LOGISTICS_STATUS_ORDER[idx + 1];
    return next || currentStatus;
  })();

  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [note, setNote] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const currentIdx = statusIndex(currentStatus || '');
  const requireContainerAndRef = isFirstUpdate(selectedStatus, currentStatus);

  // ─── Validation ─────────────────────────────────────────────────────────

  function validate() {
    const newErrors = {};
    if (requireContainerAndRef) {
      if (!containerNumber.trim()) {
        newErrors.containerNumber = 'Container number is required on first update';
      }
      if (!trackingRef.trim()) {
        newErrors.trackingRef = 'Tracking reference is required on first update';
      }
    }
    return newErrors;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(dealId, {
        status: selectedStatus,
        note: note.trim() || null,
        containerNumber: containerNumber.trim() || null,
        trackingRef: trackingRef.trim() || null,
        etaDate: etaDate || null,
      });
      // Reset form on success
      setNote('');
      setContainerNumber('');
      setTrackingRef('');
      setEtaDate('');
    } catch {
      // onSubmit handles toast — no need to re-show
    } finally {
      setSubmitting(false);
    }
  }

  const isSubmitting = submitting || loading;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-[#0A1628] rounded-xl border border-[#1E2D3D]"
    >
      <h4 className="text-sm font-semibold text-white">Submit Status Update</h4>

      {/* Status dropdown */}
      <div>
        <label className="block text-xs font-medium text-[#A0A0A0] mb-1">
          New Status <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={isSubmitting}
          className="w-full bg-[#0D1822] border border-[#2A3B52] text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#FFD700] disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22white%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
        >
          {LOGISTICS_STATUS_ORDER.map((s) => {
            const sIdx = statusIndex(s);
            // Cannot go backward: disable statuses before or equal to current
            const isDisabled = sIdx <= currentIdx && currentStatus !== null;
            return (
              <option key={s} value={s} disabled={isDisabled}>
                {SHIPMENT_STATUS_LABELS[s]}
                {isDisabled ? ' (already passed)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Note (optional) */}
      <div>
        <label className="block text-xs font-medium text-[#A0A0A0] mb-1">
          Note <span className="text-[#4A5B6E]">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
          rows={2}
          placeholder="Any comments for the buyer/seller..."
          className="w-full bg-[#0D1822] border border-[#2A3B52] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FFD700] resize-none disabled:opacity-50 placeholder-[#4A5B6E]"
        />
      </div>

      {/* Container number */}
      <div>
        <label className="block text-xs font-medium text-[#A0A0A0] mb-1">
          Container Number
          {requireContainerAndRef && <span className="text-red-400 ml-1">*</span>}
        </label>
        <input
          type="text"
          value={containerNumber}
          onChange={(e) => setContainerNumber(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. MSCU1234567"
          className={`w-full bg-[#0D1822] border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FFD700] disabled:opacity-50 placeholder-[#4A5B6E] ${
            errors.containerNumber ? 'border-red-500' : 'border-[#2A3B52]'
          }`}
        />
        {errors.containerNumber && (
          <p className="text-xs text-red-400 mt-1">{errors.containerNumber}</p>
        )}
      </div>

      {/* Tracking reference */}
      <div>
        <label className="block text-xs font-medium text-[#A0A0A0] mb-1">
          Tracking Reference
          {requireContainerAndRef && <span className="text-red-400 ml-1">*</span>}
        </label>
        <input
          type="text"
          value={trackingRef}
          onChange={(e) => setTrackingRef(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. MAEU123456789"
          className={`w-full bg-[#0D1822] border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FFD700] disabled:opacity-50 placeholder-[#4A5B6E] ${
            errors.trackingRef ? 'border-red-500' : 'border-[#2A3B52]'
          }`}
        />
        {errors.trackingRef && (
          <p className="text-xs text-red-400 mt-1">{errors.trackingRef}</p>
        )}
      </div>

      {/* ETA date */}
      <div>
        <label className="block text-xs font-medium text-[#A0A0A0] mb-1">
          Estimated Delivery Date <span className="text-[#4A5B6E]">(optional)</span>
        </label>
        <DatePicker
          value={etaDate || null}
          onChange={(dateStr) => setEtaDate(dateStr || '')}
          placeholder="Select estimated delivery date..."
          disabled={isSubmitting}
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-black text-sm font-semibold rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isSubmitting ? 'Submitting...' : 'Submit Update'}
      </button>
    </form>
  );
}

export default ShipmentUpdateForm;
