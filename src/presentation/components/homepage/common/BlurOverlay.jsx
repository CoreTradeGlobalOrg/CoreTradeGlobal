/**
 * BlurOverlay Component
 *
 * Displays a blur overlay with a call-to-action for non-authenticated users
 * Used when the 3-product view limit is reached
 */

'use client';

import Link from 'next/link';
import { Lock, UserPlus, LogIn } from 'lucide-react';

export function BlurOverlay({
  title = 'Daha Fazla İçerik Görmek İçin Üye Olun',
  description = 'Tüm ürünleri, RFQ taleplerini ve daha fazlasını görmek için ücretsiz üye olun.',
  showRegister = true,
  showLogin = true,
  className = '',
  variant = 'default', // 'default' | 'compact' | 'full'
}) {
  const isCompact = variant === 'compact';
  const isFull = variant === 'full';

  return (
    <div
      className={`blur-overlay ${isFull ? 'rounded-none' : 'rounded-2xl'} ${className}`}
    >
      <div className={`blur-overlay-content ${isCompact ? 'py-4' : 'py-8'}`}>
        {/* Lock Icon */}
        <div
          className={`mx-auto mb-4 w-16 h-16 rounded-full bg-[var(--hp-gold)]/10 flex items-center justify-center ${isCompact ? 'w-12 h-12 mb-3' : ''}`}
        >
          <Lock
            className={`text-[var(--hp-gold)] ${isCompact ? 'w-5 h-5' : 'w-7 h-7'}`}
          />
        </div>

        {/* Title */}
        <h3
          className={`font-bold text-[var(--hp-text-primary)] ${isCompact ? 'text-lg mb-2' : 'text-xl md:text-2xl mb-3'}`}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={`text-[var(--hp-text-muted)] ${isCompact ? 'text-sm mb-4' : 'mb-6'}`}
        >
          {description}
        </p>

        {/* Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-3 justify-center ${isCompact ? 'gap-2' : ''}`}
        >
          {showRegister && (
            <Link
              href="/register"
              className={`btn-gold inline-flex items-center justify-center gap-2 ${isCompact ? 'px-4 py-2 text-sm' : ''}`}
            >
              <UserPlus className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
              Ücretsiz Üye Ol
            </Link>
          )}

          {showLogin && (
            <Link
              href="/login"
              className={`btn-gold-outline inline-flex items-center justify-center gap-2 ${isCompact ? 'px-4 py-2 text-sm' : ''}`}
            >
              <LogIn className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
              Giriş Yap
            </Link>
          )}
        </div>

        {/* Benefits */}
        {!isCompact && (
          <div className="mt-6 pt-6 border-t border-[var(--hp-border)]">
            <p className="text-sm text-[var(--hp-text-muted)] mb-3">
              Üye olarak şunlara erişebilirsiniz:
            </p>
            <ul className="text-sm text-[var(--hp-text-secondary)] space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hp-gold)]" />
                Sınırsız ürün görüntüleme
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hp-gold)]" />
                RFQ taleplerine erişim
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hp-gold)]" />
                Tedarikçilerle doğrudan iletişim
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlurOverlay;
