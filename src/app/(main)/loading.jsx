/**
 * Route-level loading fallback for the (main) segment. Next.js suspends the
 * outgoing tree and renders this while the next page is streaming — without it,
 * client-side navigations leave the previous page visible until the new page's
 * top-level components resolve.
 */
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-300">Loading…</p>
    </div>
  );
}
