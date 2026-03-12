/**
 * Lawyer Workspace Page
 *
 * URL: /lawyer
 * Access: lawyer, admin (enforced by middleware)
 *
 * Redirects to /lawyer/dashboard — the full dashboard built in Phase 5.
 */

import { redirect } from 'next/navigation';

export default function LawyerWorkspacePage() {
  redirect('/lawyer/dashboard');
}
