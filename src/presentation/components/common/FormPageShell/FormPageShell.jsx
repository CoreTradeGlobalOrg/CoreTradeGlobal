/**
 * FormPageShell
 *
 * Page wrapper that mirrors the Modal panel styling so forms moved out of modals
 * (Add/Edit Product, Add/Edit Request) look identical as standalone pages.
 *
 * Props:
 *   title    {string}       - Panel header title.
 *   backHref {string}       - Optional back-link target (Link).
 *   onBack   {() => void}   - Optional handler for the back button (overrides
 *                             backHref). Use with `router.back()` when the
 *                             form should return to the previous page instead
 *                             of a fixed route (e.g. product upload).
 *   backLabel{string}       - Optional back-link label. Defaults to 'Back'.
 *   children {ReactNode}    - Form content.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function FormPageShell({ title, backHref, onBack, backLabel = 'Back', children }) {
  const backContent = (
    <>
      <ArrowLeft className="w-4 h-4" />
      {backLabel}
    </>
  );
  const backClass = "inline-flex items-center gap-2 text-[#FFD700] hover:text-white text-sm font-semibold mb-4 transition-colors";

  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-2xl mx-auto px-4">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            {backContent}
          </button>
        ) : backHref ? (
          <Link href={backHref} className={backClass}>
            {backContent}
          </Link>
        ) : null}

        <div className="bg-[#0F1B2B] rounded-2xl border border-[rgba(255,255,255,0.1)] shadow-2xl overflow-hidden">
          <div className="border-b border-white/10 px-4 py-4 md:px-8 md:py-6">
            <h1 className="text-lg md:text-2xl font-bold text-white">{title}</h1>
          </div>
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default FormPageShell;
