/**
 * HeroInfoCards Component
 *
 * Floating info cards shown on left and right sides of hero
 */

'use client';

import { TrendingUp, Shield, Zap, Award } from 'lucide-react';

const LEFT_CARD = {
  icon: TrendingUp,
  title: 'Büyüyen Pazar',
  description: 'Her gün yeni fırsatlar ve bağlantılar',
  stat: '+127%',
  statLabel: 'yıllık büyüme',
};

const RIGHT_CARD = {
  icon: Shield,
  title: 'Güvenli Ticaret',
  description: 'Doğrulanmış tedarikçiler ve alıcılar',
  badges: [
    { icon: Zap, label: 'Hızlı Yanıt' },
    { icon: Award, label: 'Güvenilir' },
  ],
};

export function HeroInfoCards({ className = '' }) {
  return (
    <>
      {/* Left Card */}
      <div className={`hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 z-10 ${className}`}>
        <div className="glass-card p-5 max-w-[220px] animate-[fadeIn_0.8s_ease_0.3s_both]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--hp-gold)]/10 flex items-center justify-center">
              <LEFT_CARD.icon className="w-5 h-5 text-[var(--hp-gold)]" />
            </div>
            <div>
              <h4 className="font-semibold text-[var(--hp-text-primary)] text-sm">
                {LEFT_CARD.title}
              </h4>
            </div>
          </div>
          <p className="text-xs text-[var(--hp-text-muted)] mb-3">
            {LEFT_CARD.description}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--hp-gold)]">
              {LEFT_CARD.stat}
            </span>
            <span className="text-xs text-[var(--hp-text-muted)]">
              {LEFT_CARD.statLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right Card */}
      <div className={`hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 z-10 ${className}`}>
        <div className="glass-card p-5 max-w-[220px] animate-[fadeIn_0.8s_ease_0.5s_both]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--hp-gold)]/10 flex items-center justify-center">
              <RIGHT_CARD.icon className="w-5 h-5 text-[var(--hp-gold)]" />
            </div>
            <div>
              <h4 className="font-semibold text-[var(--hp-text-primary)] text-sm">
                {RIGHT_CARD.title}
              </h4>
            </div>
          </div>
          <p className="text-xs text-[var(--hp-text-muted)] mb-3">
            {RIGHT_CARD.description}
          </p>
          <div className="flex gap-2">
            {RIGHT_CARD.badges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--hp-bg-primary)] rounded-lg"
              >
                <badge.icon className="w-3.5 h-3.5 text-[var(--hp-gold)]" />
                <span className="text-xs text-[var(--hp-text-secondary)]">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default HeroInfoCards;
