/**
 * Lawyer Client Channels
 *
 * URL: /lawyer/channels
 * Access: lawyer, admin (enforced by middleware)
 *
 * Redirects to /lawyer/dashboard — channels are accessed via engagement cards.
 */

import { redirect } from 'next/navigation';

export default function LawyerChannelsPage() {
  redirect('/lawyer/dashboard');
}
