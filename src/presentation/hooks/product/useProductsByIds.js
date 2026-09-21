/**
 * useProductsByIds — batch-fetches product docs for a list of ids.
 *
 * The sponsored-package pipeline references up to 5 productIds per
 * campaign (1 hero + 3 showcase + 1 products-list); rather than firing
 * one Firestore read per card, this hook chunks the id list into groups
 * of 30 (Firestore's `in` operator cap) and issues one query per chunk
 * in parallel. Cache-refs mean a re-render with the same id set does
 * not re-query. Unresolved ids resolve to `null` in the map so callers
 * can distinguish "missing product" from "still loading".
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

const CHUNK_SIZE = 30;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @param {Array<string|null|undefined>} productIds
 * @returns {Map<string, object|null>} productId → product doc data (or null if missing)
 */
export function useProductsByIds(productIds) {
  const [productMap, setProductMap] = useState(() => new Map());
  const cacheRef = useRef(new Map());

  useEffect(() => {
    const cleaned = Array.from(new Set((productIds || []).filter(Boolean)));
    if (cleaned.length === 0) return;
    const missing = cleaned.filter((id) => !cacheRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const productsRef = collection(db, 'products');
        const chunks = chunk(missing, CHUNK_SIZE);
        const snaps = await Promise.all(
          chunks.map((ids) =>
            getDocs(query(productsRef, where(documentId(), 'in', ids))),
          ),
        );
        if (cancelled) return;
        for (const snap of snaps) {
          snap.forEach((doc) => {
            cacheRef.current.set(doc.id, { id: doc.id, ...doc.data() });
          });
        }
        for (const id of missing) {
          if (!cacheRef.current.has(id)) cacheRef.current.set(id, null);
        }
        setProductMap(new Map(cacheRef.current));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useProductsByIds] batch lookup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((productIds || []).filter(Boolean).sort())]);

  return productMap;
}
