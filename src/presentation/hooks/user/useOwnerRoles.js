/**
 * useOwnerRoles — batch-resolves `role` for a list of user ids.
 *
 * Product and RFQ docs only carry `userId`; the card renderer needs
 * to know the owner's platform role to switch on the logistics
 * accent (or any other role-scoped visual treatment we add later).
 *
 * The hook chunks the id list into groups of 30 (Firestore's `in`
 * operator cap), runs one query per chunk in parallel, and returns
 * a Map<uid, role>. New uids that appear on a re-render only trigger
 * the missing lookups; cached uids stay cached for the lifetime of
 * the hook instance.
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
 * @param {Array<string|null|undefined>} userIds
 * @returns {Map<string, string>} uid → role
 */
export function useOwnerRoles(userIds) {
  const [rolesMap, setRolesMap] = useState(() => new Map());
  const cacheRef = useRef(new Map());

  useEffect(() => {
    const cleaned = Array.from(new Set((userIds || []).filter(Boolean)));
    if (cleaned.length === 0) return;
    const missing = cleaned.filter((uid) => !cacheRef.current.has(uid));
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const chunks = chunk(missing, CHUNK_SIZE);
        const snaps = await Promise.all(
          chunks.map((ids) =>
            getDocs(query(usersRef, where(documentId(), 'in', ids))),
          ),
        );
        if (cancelled) return;
        for (const snap of snaps) {
          snap.forEach((doc) => {
            cacheRef.current.set(doc.id, doc.data()?.role || null);
          });
        }
        // Users that didn't come back (deleted / never existed) get an
        // explicit null so we don't re-query them every render.
        for (const uid of missing) {
          if (!cacheRef.current.has(uid)) cacheRef.current.set(uid, null);
        }
        setRolesMap(new Map(cacheRef.current));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useOwnerRoles] batch lookup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Serialised key so a shallow-changed array reference does not
    // re-trigger the effect when the actual ids are the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((userIds || []).filter(Boolean).sort())]);

  return rolesMap;
}
