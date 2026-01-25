/**
 * HomepageRFQCard Component
 *
 * RFQ card for homepage display
 */

'use client';

import Link from 'next/link';
import { MapPin, Calendar, DollarSign, Package, Clock } from 'lucide-react';

export function HomepageRFQCard({ rfq, isBlurred = false }) {
  const formatDate = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Açık' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Kapalı' },
      inProgress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Devam Ediyor' },
    };
    const style = styles[status] || styles.open;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatBudget = (budget, currency) => {
    if (!budget) return 'Belirtilmedi';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(budget);
  };

  return (
    <div
      className={`hp-rfq-card w-[320px] flex-shrink-0 ${isBlurred ? 'opacity-50 blur-sm' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs text-[var(--hp-gold)] font-medium uppercase tracking-wider">
            {rfq.categoryName || 'RFQ'}
          </span>
          <h3 className="text-lg font-semibold text-[var(--hp-text-primary)] mt-1 line-clamp-2">
            {rfq.productName || rfq.title}
          </h3>
        </div>
        {getStatusBadge(rfq.status)}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--hp-text-muted)] line-clamp-2 mb-4">
        {rfq.description || 'Detaylı açıklama için tıklayın.'}
      </p>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-[var(--hp-gold)]" />
          <span className="text-[var(--hp-text-secondary)]">
            Miktar: {rfq.quantity || '-'} {rfq.unit || 'adet'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-[var(--hp-gold)]" />
          <span className="text-[var(--hp-text-secondary)]">
            Bütçe: {formatBudget(rfq.budget, rfq.currency)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-[var(--hp-gold)]" />
          <span className="text-[var(--hp-text-secondary)]">
            {rfq.targetCountry || rfq.deliveryLocation || 'Türkiye'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[var(--hp-border)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--hp-text-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span>Son: {formatDate(rfq.deadline || rfq.createdAt)}</span>
        </div>
        <Link
          href={`/request/${rfq.id}`}
          className="text-sm font-medium text-[var(--hp-gold)] hover:text-[var(--hp-gold-light)] transition-colors"
        >
          Detaylar &rarr;
        </Link>
      </div>
    </div>
  );
}

export default HomepageRFQCard;
