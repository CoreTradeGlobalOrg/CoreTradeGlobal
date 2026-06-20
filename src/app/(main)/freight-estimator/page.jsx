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
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] mb-4">
            <Ship className="w-7 h-7 text-[#FFD700]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Freight Estimator</h1>
          <p className="text-[#8899AA] text-sm max-w-md mx-auto">
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
