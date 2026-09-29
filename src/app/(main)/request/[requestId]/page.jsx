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

export const revalidate = 3600;

async function fetchRequest(requestId) {
  if (!requestId) return null;
  try {
    const snap = await getAdminFirestore().collection('requests').doc(requestId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[request page] fetch failed:', err);
    return null;
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
  const buyerName = author?.companyName || author?.displayName || 'Verified buyer';
  const rawDescription = request.description || `${request.productName || request.title || 'B2B request for quotation'} on CoreTradeGlobal.`;
  const name = request.productName || request.title || 'RFQ';
  const qty = request.quantity ? `${request.quantity}${request.unit ? ` ${request.unit}` : ''}` : null;

  const title = qty
    ? `RFQ: ${name} (${qty}) — ${buyerName} | CoreTradeGlobal`
    : `RFQ: ${name} — ${buyerName} | CoreTradeGlobal`;
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

function RequestJsonLd({ request, author }) {
  if (!request) return null;
  const buyerName = author?.companyName || author?.displayName || 'CoreTradeGlobal buyer';
  const canonicalUrl = `https://www.coretradeglobal.com/request/${request.id}`;
  const name = request.productName || request.title || 'RFQ';
  const payload = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name,
    description: (request.description || '').slice(0, 500) || name,
    ...(request.category ? { category: request.category } : {}),
    brand: { '@type': 'Organization', name: buyerName },
    offers: {
      '@type': 'Demand',
      url: canonicalUrl,
      ...(request.quantity ? { eligibleQuantity: { '@type': 'QuantitativeValue', value: request.quantity, unitText: request.unit || undefined } } : {}),
    },
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
      <RequestJsonLd request={plainRequest} author={plainAuthor} />
      <RequestDetailsClient initialRequest={plainRequest} initialAuthor={plainAuthor} />
    </>
  );
}
