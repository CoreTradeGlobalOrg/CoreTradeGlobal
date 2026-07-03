'use client';

/**
 * Route-level error boundary for the (main) segment. Catches uncaught render
 * errors and gives the user a retry path instead of a blank page.
 */
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[(main) route error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-gray-200 max-w-md">
        The page could not be loaded. This is usually temporary.
      </p>
      <button
        onClick={reset}
        className="mt-2 px-5 py-2 rounded-lg bg-[#FFD700] text-black font-semibold hover:brightness-110 transition"
      >
        Try again
      </button>
    </div>
  );
}
