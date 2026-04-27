/**
 * HeroStats Component
 *
 * Social proof statistics bar displayed at the bottom of the hero section.
 */

'use client';

export function HeroStats() {
  return (
    <div className="social-proof-bar">
      <div className="sp-item">
        <span className="sp-number">15K+</span>
        <span className="sp-label">Active Buyers</span>
      </div>
      <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
      <div className="sp-item">
        <span className="sp-number">500+</span>
        <span className="sp-label">Daily RFQs</span>
      </div>
      <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
      <div className="sp-item">
        <span className="sp-number">120+</span>
        <span className="sp-label">Countries</span>
      </div>
    </div>
  );
}

export default HeroStats;
