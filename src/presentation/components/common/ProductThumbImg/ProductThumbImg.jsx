'use client';

import { useCallback, useState } from 'react';
import { productThumbUrl } from '@/lib/productThumbnail';

/**
 * <img> for a product photo shown at card size: loads the 640 px thumbnail
 * (see src/lib/productThumbnail.js) and falls back to the original when the
 * thumbnail is missing. Other URLs (company logos, external images) render
 * unchanged. Takes the same props as <img>.
 */
export function ProductThumbImg({ src, onLoad, onError, ...props }) {
  const thumb = productThumbUrl(src);
  const [failedThumb, setFailedThumb] = useState(null);
  const current = thumb !== src && failedThumb !== thumb ? thumb : src;

  const handleError = (event) => {
    if (current !== src) {
      setFailedThumb(current);
      return;
    }
    onError?.(event);
  };

  // A load or error that happens before hydration never reaches React's
  // handlers (small thumbs often finish first), so check once mounted.
  // next/image does the same.
  const ref = useCallback(
    (img) => {
      if (!img || !img.complete) return;
      if (img.naturalWidth > 0) {
        onLoad?.({ currentTarget: img, target: img });
      } else if (current !== src) {
        setFailedThumb(current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current]
  );

  return <img ref={ref} src={current} onLoad={onLoad} onError={handleError} {...props} />;
}
