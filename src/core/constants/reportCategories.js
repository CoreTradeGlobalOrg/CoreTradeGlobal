/**
 * Report categories — shared between the ReportModal (submit-side)
 * and every consumer that renders a report row (my-reports page,
 * admin queue). Kept as a plain constants module so importing the
 * label map doesn't drag in the modal's Firebase/UI dependencies —
 * Turbopack was walking the whole ReportModal graph and stalling
 * cold builds on a busy dev machine.
 */

export const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam or repetitive contact' },
  { value: 'off_platform', label: 'Off-platform steering (WhatsApp / email / phone)' },
  { value: 'harassment', label: 'Harassment or abusive language' },
  { value: 'fraud', label: 'Fraud or scam attempt' },
  { value: 'fake_profile', label: 'Fake profile or impersonation' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export const REPORT_CATEGORY_LABEL = Object.fromEntries(
  REPORT_CATEGORIES.map((c) => [c.value, c.label]),
);
