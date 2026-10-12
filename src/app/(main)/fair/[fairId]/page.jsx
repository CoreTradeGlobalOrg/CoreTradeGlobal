/**
 * Fair Detail — Server Shell
 *
 * Companion to /product and /request detail shells. Fetches the fair
 * doc via firebase-admin so the SSR HTML Googlebot sees contains the
 * real event name, dates, location, and description — fixing the soft
 * 404 the client-only version produced. Emits per-page title /
 * description / canonical / OpenGraph metadata and an Event JSON-LD
 * block so Google Search can show event-rich results.
 */

import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FairDetailClient } from './FairDetailClient';

export const revalidate = 3600;

async function fetchFair(fairId) {
  if (!fairId) return null;
  try {
    const snap = await getAdminFirestore().collection('fairs').doc(fairId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fair page] fetch failed:', err);
    return null;
  }
}

function toPlain(obj) {
  if (!obj) return null;
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      if (value && typeof value === 'object' && typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000).toISOString();
      }
      if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      return value;
    })
  );
}

function truncate(text, max) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function toIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return null;
}

export async function generateMetadata({ params }) {
  const { fairId } = await params;
  const fair = await fetchFair(fairId);
  if (!fair) {
    return {
      title: 'Fair not found | CoreTradeGlobal',
      alternates: { canonical: `/fair/${fairId}` },
      robots: { index: false, follow: false },
    };
  }

  const location = fair.location || 'Global';
  const title = `${fair.name}, ${location} | CoreTradeGlobal`;
  const rawDescription =
    fair.description ||
    `${fair.name} trade fair in ${location}. Dates, venue, organizer and registration details on CoreTradeGlobal.`;
  const description = truncate(rawDescription, 155);
  const canonical = `/fair/${fairId}`;
  const image = fair.image || fair.coverImage;

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
      images: image ? [{ url: image, width: 1200, height: 630, alt: fair.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// Event JSON-LD gives Google the fields it needs for event-rich search
// results (name, dates, location). Fields are omitted when absent so
// Google doesn't choke on empty strings.
function FairJsonLd({ fair }) {
  if (!fair) return null;
  const canonicalUrl = `https://www.coretradeglobal.com/fair/${fair.id}`;
  const startIso = toIso(fair.startDate);
  const endIso = toIso(fair.endDate);
  const image = fair.image || fair.coverImage;
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: fair.name,
    description: (fair.description || '').slice(0, 500) || fair.name,
    url: canonicalUrl,
    ...(startIso ? { startDate: startIso } : {}),
    ...(endIso ? { endDate: endIso } : {}),
    ...(image ? { image } : {}),
    ...(fair.location
      ? {
          location: {
            '@type': 'Place',
            name: fair.venue || fair.location,
            address: fair.location,
          },
        }
      : {}),
    ...(fair.organizer
      ? { organizer: { '@type': 'Organization', name: fair.organizer } }
      : {}),
    eventStatus:
      fair.status === 'past'
        ? 'https://schema.org/EventRescheduled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export default async function FairDetailPage({ params }) {
  const { fairId } = await params;
  const fair = await fetchFair(fairId);
  if (!fair) return notFound();
  const plainFair = toPlain(fair);

  return (
    <>
      <FairJsonLd fair={plainFair} />
      <FairDetailClient initialFair={plainFair} fairId={fairId} />
    </>
  );
}
