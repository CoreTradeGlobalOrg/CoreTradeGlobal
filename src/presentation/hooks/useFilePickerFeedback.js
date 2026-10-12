'use client';

/**
 * useFilePickerFeedback — visible "choosing a file…" state for upload zones.
 *
 * Clicking a dropzone only opens the OS file picker, which lives outside the
 * page, so nothing on the page changes. Users get no feedback and Microsoft
 * Clarity records the click as a "dead click". This hook flips a `picking`
 * flag the moment the picker opens and clears it when the picker closes
 * (file chosen, dialog cancelled, or window focus returns).
 *
 * Usage:
 *   const inputRef = useRef(null);
 *   const { picking, openPicker, markPicking } = useFilePickerFeedback(inputRef);
 *   <div onClick={openPicker}>…</div>          // dropzone that proxies to a hidden input
 *   <input ref={inputRef} type="file" onClick={markPicking} /> // input clicked directly
 */

import { useState, useEffect, useCallback } from 'react';

// Safety net in case no close signal ever arrives
const MAX_PICKING_MS = 60_000;
// `focus` can fire just before `change`; give `change` a moment to land first
const FOCUS_SETTLE_MS = 300;

export function useFilePickerFeedback(inputRef) {
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!picking) return undefined;

    const input = inputRef.current;
    const done = () => setPicking(false);
    let focusTimer = null;
    const onWindowFocus = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(done, FOCUS_SETTLE_MS);
    };

    input?.addEventListener('change', done);
    input?.addEventListener('cancel', done); // Chrome 113+, Safari 16.4+, Firefox 91+
    window.addEventListener('focus', onWindowFocus);
    const safety = setTimeout(done, MAX_PICKING_MS);

    return () => {
      input?.removeEventListener('change', done);
      input?.removeEventListener('cancel', done);
      window.removeEventListener('focus', onWindowFocus);
      clearTimeout(focusTimer);
      clearTimeout(safety);
    };
  }, [picking, inputRef]);

  /** For an input that receives the click itself (e.g. a transparent overlay input). */
  const markPicking = useCallback(() => {
    if (inputRef.current?.disabled) return;
    setPicking(true);
  }, [inputRef]);

  /** For a dropzone/button that proxies the click to a hidden input. */
  const openPicker = useCallback(() => {
    const input = inputRef.current;
    if (!input || input.disabled) return;
    setPicking(true);
    input.click();
  }, [inputRef]);

  return { picking, openPicker, markPicking };
}
