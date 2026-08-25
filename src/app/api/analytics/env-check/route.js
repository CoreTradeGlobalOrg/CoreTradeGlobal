/**
 * /api/analytics/env-check — presence-only diagnostic.
 *
 * Reports which analytics env vars are visible at runtime on the
 * server. NEVER echoes values — just booleans + length + first/last
 * few characters where useful to spot copy-paste truncation.
 *
 * Temporary — remove or gate behind admin auth once env issues
 * are settled.
 */

import { NextResponse } from 'next/server';

function describe(value) {
  if (value === undefined || value === null || value === '') {
    return { present: false };
  }
  return {
    present: true,
    length: value.length,
    startsWith: value.slice(0, 10),
    endsWith: value.slice(-6),
  };
}

export async function GET() {
  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    checks: {
      GSC_CLIENT_EMAIL: describe(process.env.GSC_CLIENT_EMAIL),
      GSC_PRIVATE_KEY: describe(process.env.GSC_PRIVATE_KEY),
      GSC_PROPERTY_URL: describe(process.env.GSC_PROPERTY_URL),
      HUBSPOT_ACCESS_TOKEN: describe(process.env.HUBSPOT_ACCESS_TOKEN),
      NEXT_PUBLIC_HUBSPOT_PORTAL_ID: describe(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID),
    },
    // Basic sanity: does the private key contain \n escapes or real
    // newlines? A common Vercel paste mistake collapses them.
    privateKeyShape: (() => {
      const k = process.env.GSC_PRIVATE_KEY || '';
      if (!k) return null;
      return {
        hasLiteralBackslashN: /\\n/.test(k),
        hasRealNewlines: /\n/.test(k),
        startsWithHeader: k.startsWith('-----BEGIN PRIVATE KEY-----'),
        endsWithFooterVariant: k.endsWith('-----END PRIVATE KEY-----') ||
                               k.endsWith('-----END PRIVATE KEY-----\n') ||
                               k.endsWith('-----END PRIVATE KEY-----\\n'),
      };
    })(),
  });
}
