/**
 * Partner Requests
 *
 * Shared by the /partnership form and the admin Partner Requests tab.
 * The `value`s are stored on `partnerRequests` docs. firestore.rules lists
 * the same type values, and functions/index.js mirrors the type labels for
 * the emails (CommonJS cannot import this file). Change all three together.
 */

export const PARTNER_TYPES = [
  {
    value: 'logistics_insurance',
    label: 'Logistics / Insurance Provider',
    description: 'Offer freight, customs or trade insurance to our members.',
  },
  {
    value: 'technology_media',
    label: 'Technology / Media Partner',
    description: 'Integrations, software, events or media collaborations.',
  },
  {
    value: 'country_representative',
    label: 'Country Representative',
    description: 'Represent CoreTradeGlobal in your country.',
  },
  {
    value: 'referral',
    label: 'Referral Partner',
    description: 'Introduce companies to CoreTradeGlobal.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else? Tell us about it.',
  },
];

export const PARTNER_TYPE_LABELS = Object.fromEntries(
  PARTNER_TYPES.map((t) => [t.value, t.label])
);

export const PARTNER_REQUEST_STATUSES = {
  NEW: 'new',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
};

export const PARTNER_REQUEST_STATUS_LABELS = {
  new: 'New',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

/** Field limits, mirrored in firestore.rules. */
export const PARTNER_REQUEST_LIMITS = {
  name: 200,
  company: 200,
  email: 254,
  phone: 40,
  website: 500,
  message: 2000,
};
