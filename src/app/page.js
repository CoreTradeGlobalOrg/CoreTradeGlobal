/**
 * Home Page
 * Coming soon landing page with newsletter subscription
 */

import { Card } from '@/components/ui/Card';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { theme } from '@/config/theme';

export default function Home() {
  return (
    <main className={`min-h-screen flex items-center justify-center ${theme.colors.background} p-4`}>
      <Card className="max-w-2xl w-full">
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold ${theme.colors.text.primary} mb-4`}>
            🚀 We&apos;re Building Something Amazing
          </h1>
          
          <p className={`text-xl ${theme.colors.text.secondary} mb-2`}>
            Our website is still in development
          </p>
          
          <p className={`text-lg ${theme.colors.text.tertiary}`}>
            Be the first to know when we launch. Subscribe to our newsletter!
          </p>
        </header>

        {/* Newsletter Form */}
        <NewsletterForm />

        {/* Footer */}
        <footer className={`mt-8 text-center ${theme.colors.text.muted} text-sm`}>
          <p className="flex items-center justify-center gap-2">
            <span aria-hidden="true">🔒</span>
            <span>We respect your privacy. Unsubscribe at any time.</span>
          </p>
        </footer>
      </Card>
    </main>
  );
}