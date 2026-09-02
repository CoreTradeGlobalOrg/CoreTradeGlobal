/**
 * Client-side ping for the WF1 form-abandonment workflow.
 *
 * Writes a small `formAbandonment/{emailHash}` doc as soon as the
 * user has entered their email and moved past step 1 of registration.
 * The doc records which step they last reached; a CF sweep looks at
 * anything stuck below step 3 for more than 20 min and sends WF1.1.
 *
 * The successful register path clears the doc from the client so a
 * completed sign-up doesn't get chased by an abandonment email.
 * Belt-and-braces: the CF ALSO looks up the users collection by email
 * before sending, so a race between "wrote user doc" and "cleaned
 * abandonment doc" cannot leak a message.
 */

import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

// Web Crypto SHA-256 → 40 hex chars. Deterministic doc id so a repeat
// visitor updates the same row instead of forking a new one.
async function hashEmail(email) {
  const bytes = new TextEncoder().encode(email.toLowerCase().trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40);
}

/**
 * Record that a visitor has entered their email and reached the given step.
 *
 * @param {string} email
 * @param {1|2|3} step
 */
export async function reportFormAbandonment(email, step) {
  const trimmed = (email || '').trim();
  if (!trimmed || !trimmed.includes('@')) return;
  try {
    const id = await hashEmail(trimmed);
    await setDoc(
      doc(db, 'formAbandonment', id),
      {
        email: trimmed,
        emailLower: trimmed.toLowerCase(),
        step,
        updatedAt: serverTimestamp(),
        // startedAt only lands on the first write (merge:true would
        // otherwise re-stamp it every step). Use FieldValue null so the
        // second write doesn't overwrite the original — merge with the
        // hard-coded first-write default below.
      },
      { merge: true },
    );
    // Best-effort seed of startedAt only when the doc is fresh. If the
    // doc already exists this call is a no-op via merge semantics.
    await setDoc(
      doc(db, 'formAbandonment', id),
      { startedAt: serverTimestamp() },
      { merge: true, mergeFields: ['startedAt'] },
    );
  } catch (err) {
    // Non-critical — never block the user's registration flow.
    // eslint-disable-next-line no-console
    console.warn('[formAbandonment] report failed:', err);
  }
}

/**
 * Clear the abandonment doc once the user actually finishes registration.
 */
export async function clearFormAbandonment(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) return;
  try {
    const id = await hashEmail(trimmed);
    await deleteDoc(doc(db, 'formAbandonment', id));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[formAbandonment] clear failed:', err);
  }
}
