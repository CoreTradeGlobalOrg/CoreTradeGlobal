/**
 * Wire Transfer Constants
 *
 * Single source of truth for the Enpara beneficiary details shown on
 * the /pricing/inquire/pay/[inquiryId] page and embedded in the
 * payment-instructions email. Any change here flows to both surfaces
 * without a schema migration — the wire fields are display-only, not
 * persisted per inquiry.
 *
 * The payment reference is short + human-typable (6 hex chars) so the
 * sender can key it into the Enpara memo field without truncation.
 * Access to the payment page is gated by auth (owner or admin), so the
 * reference is a matching aid for the admin, NOT an access token.
 */

export const WIRE_TRANSFER_DETAILS = {
  beneficiaryName: 'Sahin Ata Tandogan',
  iban: 'TR27 0015 7000 0000 0101 3231 16',
  accountNumber: '101323116',
  branchCode: '03663',
  beneficiaryAddress: 'Ankara, Turkey',
  bankName: 'Enpara Bank A.S.',
  swiftBic: 'ENASTRISXXX',
  bankCountry: 'Turkey',
  paymentReferenceLabel: 'CoreTradeGlobal Services',
  senderFeeOption: 'OUR',
};

// Days the picked month is held after inquiry submit before the
// reservation expires and the slot returns to the pool.
export const PAYMENT_RESERVATION_DAYS = 7;

// Payment lifecycle. `awaiting_payment` is the state a fresh inquiry
// lands in; `reported` fires when the buyer clicks "I've sent the wire";
// `paid` is admin-confirmed; `expired` is what the daily sweep flips
// inquiries to after PAYMENT_RESERVATION_DAYS with no payment. The two
// live states (awaiting_payment + reported) are what the month-picker
// treats as "booked" to prevent double-booking during the reservation
// window.
export const PAYMENT_STATUSES = {
  AWAITING: 'awaiting_payment',
  REPORTED: 'reported',
  PAID: 'paid',
  EXPIRED: 'expired',
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUSES.AWAITING]: 'Awaiting payment',
  [PAYMENT_STATUSES.REPORTED]: 'Payment reported',
  [PAYMENT_STATUSES.PAID]: 'Paid',
  [PAYMENT_STATUSES.EXPIRED]: 'Reservation expired',
};

// States that still hold a month reservation (block other buyers).
export const RESERVING_PAYMENT_STATUSES = [
  PAYMENT_STATUSES.AWAITING,
  PAYMENT_STATUSES.REPORTED,
  PAYMENT_STATUSES.PAID,
];

/**
 * Generate a 6-character hex payment reference prefixed with `CTG-`.
 * Uses crypto.getRandomValues where available (browser + Node ≥ 15) and
 * falls back to Math.random for the vanishingly rare case where crypto
 * isn't in scope — the reference is a matching aid, not a security
 * secret, so best-effort randomness is fine.
 */
export function generatePaymentReference() {
  const bytes = new Uint8Array(3);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `CTG-${hex}`;
}
