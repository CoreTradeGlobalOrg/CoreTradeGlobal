/**
 * "Page settled" signal for work that should not compete with the first
 * screen: below-the-fold Firestore queries, realtime refreshes of data the
 * server already rendered, and route prefetching.
 *
 * Fires once, a few seconds after the `load` event (then on idle), or as
 * soon as the visitor scrolls, taps or types, so someone heading down the
 * page gets the content right away. On a slow phone everything before
 * `load` (HTML, CSS, JS, above-the-fold images) gets the bandwidth first.
 */

const DELAY_AFTER_LOAD_MS = 3000;
const INTERACTION_EVENTS = ['scroll', 'pointerdown', 'keydown', 'wheel', 'touchstart'];

let settled = false;
let scheduled = false;
const listeners = new Set();

function settle() {
  if (settled) return;
  settled = true;
  INTERACTION_EVENTS.forEach((type) => window.removeEventListener(type, settle, true));
  listeners.forEach((listener) => listener());
  listeners.clear();
}

function schedule() {
  if (scheduled || typeof window === 'undefined') return;
  scheduled = true;
  INTERACTION_EVENTS.forEach((type) =>
    window.addEventListener(type, settle, { capture: true, passive: true, once: true })
  );
  const afterLoad = () => {
    setTimeout(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(settle, { timeout: 2000 });
      else settle();
    }, DELAY_AFTER_LOAD_MS);
  };
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
}

export function isPageSettled() {
  return settled;
}

export function subscribePageSettled(listener) {
  if (settled) return () => {};
  listeners.add(listener);
  schedule();
  return () => listeners.delete(listener);
}
