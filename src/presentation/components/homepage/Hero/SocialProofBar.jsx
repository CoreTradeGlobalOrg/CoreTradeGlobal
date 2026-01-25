/**
 * SocialProofBar Component
 *
 * Statistics bar showing platform metrics
 */

'use client';

import { useEffect, useState } from 'react';
import { Users, Package, FileText, Globe } from 'lucide-react';

const STATS = [
  { icon: Users, value: 5000, suffix: '+', label: 'Aktif Üye' },
  { icon: Package, value: 15000, suffix: '+', label: 'Ürün' },
  { icon: FileText, value: 3500, suffix: '+', label: 'RFQ Talebi' },
  { icon: Globe, value: 45, suffix: '+', label: 'Ülke' },
];

function AnimatedCounter({ value, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setCount(current);

      if (step >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num.toString();
  };

  return (
    <span>
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export function SocialProofBar({ className = '' }) {
  return (
    <div className={`social-proof-bar ${className}`}>
      {STATS.map((stat, index) => (
        <div key={stat.label} className="social-proof-item">
          <div className="flex items-center justify-center gap-2">
            <stat.icon className="w-5 h-5 text-[var(--hp-gold)]" />
            <span className="social-proof-number">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </span>
          </div>
          <div className="social-proof-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default SocialProofBar;
