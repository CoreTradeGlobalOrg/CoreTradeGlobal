'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { MessagesWidget } from '@/presentation/components/common/MessagesWidget/MessagesWidget';
import { NotificationPrompt } from '@/presentation/components/common/NotificationPrompt/NotificationPrompt';
import { NotificationListener } from '@/presentation/components/common/NotificationListener/NotificationListener';
import { InstallPrompt } from '@/presentation/components/common/InstallPrompt/InstallPrompt';
import { CookieConsent } from '@/presentation/components/common/CookieConsent/CookieConsent';
import { ScrollToTop } from '@/presentation/components/common/ScrollToTop/ScrollToTop';
import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary';
import { CurrencyTicker } from '@/presentation/components/homepage/CurrencyTicker/CurrencyTicker';
import './homepage.css';

export default function MainLayout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <div className="currency-ticker-bar">
        <CurrencyTicker />
      </div>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Footer />
      <MessagesWidget />
      <NotificationPrompt />
      <NotificationListener />
      <InstallPrompt />
      <CookieConsent />
    </>
  );
}
