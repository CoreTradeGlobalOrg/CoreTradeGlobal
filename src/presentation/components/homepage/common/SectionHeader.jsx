/**
 * SectionHeader Component
 *
 * Reusable section header with title, subtitle, and optional action button
 */

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SectionHeader({
  title,
  subtitle,
  accentWord,
  action,
  actionLabel = 'Tümünü Gör',
  actionHref = '#',
  centered = false,
  className = '',
}) {
  // If accentWord is provided, highlight it in the title
  const renderTitle = () => {
    if (!accentWord) {
      return title;
    }

    const parts = title.split(new RegExp(`(${accentWord})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === accentWord.toLowerCase() ? (
        <span key={index} className="text-gold-gradient">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={`flex flex-col ${centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} mb-8 ${className}`}
    >
      <div className={centered ? 'max-w-2xl' : ''}>
        <h2 className="hp-section-title">{renderTitle()}</h2>
        {subtitle && <p className="hp-section-subtitle !mb-0">{subtitle}</p>}
      </div>

      {action && (
        <Link
          href={actionHref}
          className="mt-4 md:mt-0 inline-flex items-center gap-2 text-[var(--hp-gold)] hover:text-[var(--hp-gold-light)] transition-colors font-semibold"
        >
          {actionLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default SectionHeader;
