/**
 * FAQ Page
 *
 * Standalone page for Frequently Asked Questions
 * URL: /faq
 */

import { FAQSection } from '@/presentation/components/homepage/FAQ/FAQSection';

export const metadata = {
  title: 'FAQ - CoreTradeGlobal',
  description: 'Frequently asked questions about CoreTradeGlobal B2B trading platform',
};

export default function FAQPage() {
  return (
    <main className="min-h-screen pt-[100px] bg-radial-navy">
      <FAQSection />
    </main>
  );
}
