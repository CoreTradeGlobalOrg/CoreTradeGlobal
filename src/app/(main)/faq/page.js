/**
 * FAQ Page
 *
 * Standalone page for Frequently Asked Questions
 * URL: /faq
 */

import { FAQSection } from '@/presentation/components/homepage/FAQ/FAQSection';

export default function FAQPage() {
  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-radial-navy">
      <FAQSection />
    </main>
  );
}
