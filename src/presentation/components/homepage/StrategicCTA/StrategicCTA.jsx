/**
 * StrategicCTA Component
 *
 * Call-to-action section for the homepage
 * Matches design exactly from index.html
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Package, FileText } from 'lucide-react';

export function StrategicCTA() {
  const { isAuthenticated, loading } = useAuth();

  if (isAuthenticated) {
    return null; // Don't show CTA for authenticated users
  }

  return (
    <section className="strategic-cta">
      <div className="cta-container-main">
        {/* Seller Side */}
        <div className="cta-box-half">
          <div className="cta-icon-bg">
            <Package className="w-10 h-10" />
          </div>
          <h3>Are You a Seller?</h3>
          <p>
            Register as a supplier to list your products and receive quote
            requests from buyers worldwide. Expand your global reach with
            CoreTradeGlobal.
          </p>
          {!loading && (
            <Link href="/register?type=seller" className="btn-cta-main btn-cta-gold">
              Register as Supplier
            </Link>
          )}
        </div>

        {/* Divider */}
        <div className="cta-divider-line" />

        {/* Buyer Side */}
        <div className="cta-box-half">
          <div className="cta-icon-bg">
            <FileText className="w-10 h-10" />
          </div>
          <h3>Are You a Buyer?</h3>
          <p>
            Register as a buyer to search for products, create RFQs, and connect
            with verified suppliers. Find the best deals on CoreTradeGlobal.
          </p>
          {!loading && (
            <Link href="/register?type=buyer" className="btn-cta-main btn-cta-outline">
              Register as Buyer
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default StrategicCTA;
