/**
 * Freight Estimator Page
 *
 * URL: /freight-estimator
 * Public tool — estimate ocean/air/road freight rates between two locations.
 * Reuses the same FreightEstimatorWidget used in the deal sidebar (standalone mode).
 */

'use client';

import { Ship } from 'lucide-react';
import { FreightEstimatorWidget } from '@/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget';

export default function FreightEstimatorPage() {
  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] mb-5">
            <Ship className="w-8 h-8 text-[#FFD700]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Freight Estimator</h1>
          <p className="text-[#8899AA] text-base md:text-lg max-w-2xl mx-auto">
            Get instant ocean, air, and road freight estimates between any two
            locations. Enter your route and cargo details to compare transit
            times and price ranges.
          </p>
        </div>

        {/* Estimator */}
        <FreightEstimatorWidget standalone />
      </div>
    </main>
  );
}
