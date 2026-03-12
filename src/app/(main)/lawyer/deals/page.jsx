/**
 * Lawyer Deal Review
 *
 * URL: /lawyer/deals
 * Access: lawyer, admin (enforced by middleware)
 *
 * Redirects to /lawyer/dashboard — deals are accessed via engagement cards.
 */

import { redirect } from 'next/navigation';

export default function LawyerDealsPage() {
  redirect('/lawyer/dashboard');
}
