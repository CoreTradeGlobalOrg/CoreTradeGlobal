/**
 * useBulkCreateFairs Hook
 *
 * Creates many fairs at once from parsed CSV rows. Mirrors useCreateFair's
 * shape but takes an array of pre-validated fair records and reports
 * per-row success / failure so the admin UI can flag problem rows.
 *
 * Not a Firestore batched write — parallel calls to FairsRepository.create
 * via Promise.allSettled. Typical fair uploads are 20-100 rows and a batch
 * write would tangle error attribution; parallel-with-Settled keeps every
 * failure attributable to its row.
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

export function useBulkCreateFairs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const bulkCreateFairs = async (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { created: 0, failed: 0, errors: [] };
    }

    setLoading(true);
    setError(null);

    try {
      const fairsRepository = container.getFairsRepository();

      const results = await Promise.allSettled(
        rows.map((row) => fairsRepository.create(row))
      );

      const created = results.filter((r) => r.status === 'fulfilled').length;
      const errors = results
        .map((r, i) => (r.status === 'rejected' ? { index: i, message: r.reason?.message || 'Unknown error' } : null))
        .filter(Boolean);

      if (created > 0 && errors.length === 0) {
        toast.success(`${created} fair${created === 1 ? '' : 's'} imported successfully`);
      } else if (created > 0 && errors.length > 0) {
        toast.success(`${created} imported, ${errors.length} failed — see details`);
      } else {
        toast.error(`Import failed — ${errors.length} row${errors.length === 1 ? '' : 's'} rejected`);
      }

      return { created, failed: errors.length, errors };
    } catch (err) {
      console.error('useBulkCreateFairs error:', err);
      setError(err.message);
      toast.error('Bulk import failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bulkCreateFairs,
    loading,
    error,
  };
}

export default useBulkCreateFairs;
