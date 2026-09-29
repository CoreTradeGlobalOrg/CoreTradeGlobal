/**
 * Product Detail — Server Shell
 *
 * The interactive UI lives in ProductDetailClient (a client component
 * with all the hooks, modals, and per-user state). This shell handles
 * the SEO surface Googlebot needs on first render:
 *
 *   - fetches the product + seller doc via firebase-admin so the SSR
 *     HTML already has the real product content (client component
 *     seeded via initialProduct prop uses it as its first-render state)
 *   - generateMetadata emits product-specific title, description,
 *     canonical URL, and OpenGraph tags
 *   - Product JSON-LD script inline
 *
 * The earlier setup was `'use client'` at the top of page.jsx, so the
 * server-rendered HTML was empty (just navbar + footer) and every page
 * claimed canonical='/' — Google indexed nothing.
 */

import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { ProductDetailClient } from './ProductDetailClient';

// Revalidate hourly so listing edits (price/status/description tweaks)
// flow into cached HTML without waiting for a manual redeploy.
export const revalidate = 3600;

async function fetchProduct(productId) {
  if (!productId) return null;
  try {
    const snap = await getAdminFirestore().collection('products').doc(productId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[product page] fetch failed:', err);
    return null;
  }
}

async function fetchSeller(userId) {
  if (!userId) return null;
  try {
    const snap = await getAdminFirestore().collection('users').doc(userId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch {
    return null;
  }
}

// Timestamp fields from Firestore aren't serializable across the
// server/client boundary — strip them (client hook re-fetches the live
// doc anyway, so the loss is temporary).
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
  const { productId } = await params;
  const product = await fetchProduct(productId);
  if (!product) {
    return {
      title: 'Product not found | CoreTradeGlobal',
      alternates: { canonical: `/product/${productId}` },
      robots: { index: false, follow: false },
    };
  }

  const seller = await fetchSeller(product.userId);
  const sellerName = seller?.companyName || seller?.displayName || 'CoreTradeGlobal supplier';
  const rawDescription = product.description || `${product.name} — B2B wholesale offer on CoreTradeGlobal.`;

  const title = `${product.name} — ${sellerName} | CoreTradeGlobal`;
  const description = truncate(rawDescription, 155);
  const canonical = `/product/${productId}`;
  const image = product.images?.[0];

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
      images: image ? [{ url: image, width: 1200, height: 630, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// Emit a Product JSON-LD block so crawlers that parse structured data
// (Google, Bing, LLM search) can pick up the name/image/price/brand
// even before they render the interactive card.
function ProductJsonLd({ product, seller }) {
  if (!product) return null;
  const sellerName = seller?.companyName || seller?.displayName || 'CoreTradeGlobal';
  const canonicalUrl = `https://www.coretradeglobal.com/product/${product.id}`;
  const image = product.images?.[0] || undefined;
  const payload = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: (product.description || '').slice(0, 500) || product.name,
    ...(image ? { image } : {}),
    brand: { '@type': 'Brand', name: sellerName },
    ...(product.category ? { category: product.category } : {}),
    ...(product.price
      ? {
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: product.currency || 'USD',
            availability: product.status === 'active'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: canonicalUrl,
            seller: { '@type': 'Organization', name: sellerName },
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export default async function ProductDetailPage({ params }) {
  const { productId } = await params;
  const product = await fetchProduct(productId);
  if (!product) return notFound();
  const seller = await fetchSeller(product.userId);

  const plainProduct = toPlain(product);
  const plainSeller = toPlain(seller);

  return (
    <>
      <ProductJsonLd product={plainProduct} seller={plainSeller} />
      <ProductDetailClient initialProduct={plainProduct} initialSeller={plainSeller} />
    </>
  );
}
