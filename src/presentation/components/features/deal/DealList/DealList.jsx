/**
 * DealList Component
 *
 * Renders a list of DealCard components.
 * Adapts grid/list layout to the deals page design.
 *
 * Props:
 *   deals         {Deal[]} - Array of Deal entities
 *   currentUserId {string} - UID of authenticated user (forwarded to DealCard)
 */

'use client';

import { DealCard } from '@/presentation/components/features/deal/DealCard/DealCard';

export function DealList({ deals = [], currentUserId }) {
  if (deals.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

export default DealList;
