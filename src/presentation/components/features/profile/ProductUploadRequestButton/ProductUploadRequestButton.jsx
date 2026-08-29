/**
 * ProductUploadRequestButton
 *
 * Profile-page card that funnels members into the self-serve bulk
 * upload flow. The old help-request pathway (message a CTG admin +
 * upload CSV for them to process) has been retired — bulk upload is
 * fully self-serve now, and the button just routes to the guide.
 */

'use client';

import Link from 'next/link';
import { FileUp } from 'lucide-react';

// eslint-disable-next-line no-unused-vars
export function ProductUploadRequestButton({ user }) {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="text-white font-semibold text-base mb-1">Bulk Upload</h4>
          <p className="text-[#A0A0A0] text-xs">
            Upload your entire product catalog from a CSV file — live validation
            in the browser, image attach per row, then publish.
          </p>
        </div>
        <Link
          href="/bulk-upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] text-sm font-bold no-underline whitespace-nowrap"
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
        >
          <FileUp className="w-4 h-4" />
          Upload CSV
        </Link>
      </div>
    </div>
  );
}

export default ProductUploadRequestButton;
