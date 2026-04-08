/**
 * Provider Root Page
 *
 * URL: /provider
 * Redirects to /provider/dashboard — the actual provider portal entry point.
 *
 * Server component redirect (no 'use client' needed).
 */

import { redirect } from 'next/navigation';

export default function ProviderPage() {
  redirect('/provider/dashboard');
}
