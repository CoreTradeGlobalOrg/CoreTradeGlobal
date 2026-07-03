/**
 * StrategicCTA Component
 *
 * Call-to-action section for the homepage
 * Matches design exactly from Strategic CTA v2.html
 *
 * - Logged in: Opens product/request creation dialogs
 * - Not logged in: Redirects to register
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';

export function StrategicCTA() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const handleSellClick = () => {
    router.push(isAuthenticated && user ? '/product/new' : '/register?type=seller');
  };

  const handleBuyClick = () => {
    router.push(isAuthenticated && user ? '/request/new' : '/register?type=buyer');
  };

  return (
    <>
      <section className="strategic-cta-v2">
        <div className="cta-container-v2">
          {/* Seller Card */}
          <div className="cta-card-v2">
            <div className="cta-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h2>Ready to Export?</h2>
            <p>
              Expand your business globally. Showcase your products to buyers worldwide.
              <span className="cta-action-highlight">Upload Your First Product:</span>
            </p>
            {!loading && (
              <button onClick={handleSellClick} className="cta-btn cta-btn-sell">
                I want to sell
              </button>
            )}
          </div>

          {/* Buyer Card */}
          <div className="cta-card-v2">
            <div className="cta-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2>Sourcing a Product?</h2>
            <p>
              Describe your requirements, receive quotes from verified global manufacturers.
              <span className="cta-action-highlight">Post Your First RFQ:</span>
            </p>
            {!loading && (
              <button onClick={handleBuyClick} className="cta-btn cta-btn-buy">
                I want to buy
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default StrategicCTA;
