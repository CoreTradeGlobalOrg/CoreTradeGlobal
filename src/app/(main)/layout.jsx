'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { MessagesWidget } from '@/presentation/components/common/MessagesWidget/MessagesWidget';
import { NotificationPrompt } from '@/presentation/components/common/NotificationPrompt/NotificationPrompt';
import { NotificationListener } from '@/presentation/components/common/NotificationListener/NotificationListener';
import { InstallPrompt } from '@/presentation/components/common/InstallPrompt/InstallPrompt';
import { CookieConsent } from '@/presentation/components/common/CookieConsent/CookieConsent';
import { ScrollToTop } from '@/presentation/components/common/ScrollToTop/ScrollToTop';
import './homepage.css';

export default function MainLayout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      {children}
      <Footer />
      <MessagesWidget />
      <NotificationPrompt />
      <NotificationListener />
      <InstallPrompt />
      <CookieConsent />
    </>
  );
}
