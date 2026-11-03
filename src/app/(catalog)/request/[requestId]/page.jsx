/**
 * Request (RFQ) Detail — Server Shell
 *
 * Companion to /product/[productId]/page.jsx. Fetches the request doc
 * + author via firebase-admin so the SSR HTML lands with the real
 * "500 MT Deformed Steel — CN" content instead of the "Loading request
 * details…" placeholder Google was previously seeing. Also emits a
 * per-page canonical + OpenGraph metadata and a schema.org/Product
 * JSON-LD block (RFQs describe the goods the buyer wants — the same
 * fields Product schema uses).
 */

import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { RequestDetailsClient } from './RequestDetailsClient';
import { isAnonymousGuest } from '@/core/utils/publicIdentity';

// Revalidate hourly as a fallback; edits and deletes made in the app
// refresh the page right away through /api/revalidate.
export const revalidate = 3600;

// Rendered on first visit, then served from the cache (ISR). See
// product/[productId]/page.jsx.
export async function generateStaticParams() {
  return [];
}

// null only when the RFQ does not exist; a Firestore error throws so the
// cache never keeps a 404 for a page that exists.
async function fetchRequest(requestId) {
  if (!requestId) return null;
  try {
    const snap = await getAdminFirestore().collection('requests').doc(requestId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[request page] fetch failed:', err);
    throw err;
  }
}

async function fetchAuthor(userId) {
  if (!userId) return null;
  try {
    const snap = await getAdminFirestore().collection('users').doc(userId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch {
    return null;
  }
}

function toPlain(obj) {
  if (!obj) return null;
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    if (value && typeof value === 'object' && typeof value._seconds === 'number') {
      return new Date(value._seconds * 1000).toISOString();
    }
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    return value;
  }));
}

function truncate(text, max) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function generateMetadata({ params }) {
  const { requestId } = await params;
  const request = await fetchRequest(requestId);
  if (!request) {
    return {
      title: 'Request not found | CoreTradeGlobal',
      alternates: { canonical: `/request/${requestId}` },
      robots: { index: false, follow: false },
    };
  }

  const author = await fetchAuthor(request.userId);
  const buyerName = (!isAnonymousGuest(author) && (author?.companyName || author?.displayName)) || 'Verified buyer';
  const rawDescription = request.description || `${request.productName || request.title || 'B2B request for quotation'} on CoreTradeGlobal.`;
  const name = request.productName || request.title || 'RFQ';
  const qty = request.quantity ? `${request.quantity}${request.unit ? ` ${request.unit}` : ''}` : null;

  const title = qty
    ? `RFQ: ${name} (${qty}) by ${buyerName} | CoreTradeGlobal`
    : `RFQ: ${name} by ${buyerName} | CoreTradeGlobal`;
  const description = truncate(rawDescription, 155);
  const canonical = `/request/${requestId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      siteName: 'CoreTradeGlobal',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// An RFQ is a buyer's request, so it is marked up as a schema.org Demand,
// not a Product for sale. It used to be a Product with `offers` of type
// Demand, which Search Console reported as a critical error ("invalid
// object type for field offers": Google accepts only Offer or
// AggregateOffer there). Google has no rich result for Demand, so it is
// not validated; it still describes the page to crawlers.
function RequestJsonLd({ request }) {
  if (!request) return null;
  const canonicalUrl = `https://www.coretradeglobal.com/request/${request.id}`;
  const name = request.productName || request.title || 'RFQ';
  const payload = {
    '@context': 'https://schema.org/',
    '@type': 'Demand',
    name,
    description: (request.description || '').slice(0, 500) || name,
    url: canonicalUrl,
    ...(request.category ? { category: request.category } : {}),
    ...(request.quantity ? { eligibleQuantity: { '@type': 'QuantitativeValue', value: request.quantity, unitText: request.unit || undefined } } : {}),
    // Destination country as an ISO 3166-1 code, which eligibleRegion accepts.
    ...(request.targetCountry ? { eligibleRegion: request.targetCountry } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export default async function RequestDetailsPage({ params }) {
  const { requestId } = await params;
  const request = await fetchRequest(requestId);
  if (!request) return notFound();
  const author = await fetchAuthor(request.userId);

  const plainRequest = toPlain(request);
  const plainAuthor = toPlain(author);

  return (
    <>
      <RequestJsonLd request={plainRequest} />
      <RequestDetailsClient initialRequest={plainRequest} initialAuthor={plainAuthor} />
    </>
  );
}
