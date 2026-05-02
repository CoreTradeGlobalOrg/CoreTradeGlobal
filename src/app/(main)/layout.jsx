'use client';

import Script from 'next/script';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { MessagesWidget } from '@/presentation/components/common/MessagesWidget/MessagesWidget';
import { NotificationPrompt } from '@/presentation/components/common/NotificationPrompt/NotificationPrompt';
import { NotificationListener } from '@/presentation/components/common/NotificationListener/NotificationListener';
import { InstallPrompt } from '@/presentation/components/common/InstallPrompt/InstallPrompt';
import { CookieConsent } from '@/presentation/components/common/CookieConsent/CookieConsent';
import { ScrollToTop } from '@/presentation/components/common/ScrollToTop/ScrollToTop';
import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary';
import './homepage.css';

const ZOHO_WIDGET_KEY = process.env.NEXT_PUBLIC_ZOHO_WIDGET_KEY;

export default function MainLayout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Footer />
      <MessagesWidget />
      <NotificationPrompt />
      <NotificationListener />
      <InstallPrompt />
      <CookieConsent />
      {ZOHO_WIDGET_KEY && (
        <Script
          id="zoho-salesiq"
          strategy="lazyOnload"
        >{`
          window.$zoho = window.$zoho || {};
          window.$zoho.salesiq = window.$zoho.salesiq || { widgetcode: "${ZOHO_WIDGET_KEY}", values: {}, ready: function(){} };
          var d = document;
          var s = d.createElement("script");
          s.type = "text/javascript";
          s.id = "zsiqscript";
          s.defer = true;
          s.src = "https://salesiq.zohopublic.com/widget";
          var t = d.getElementsByTagName("script")[0];
          t.parentNode.insertBefore(s, t);
          window.$zoho.salesiq.ready = function() {
            window.$zoho.salesiq.floatbutton.visible("hide");
          };
        `}</Script>
      )}
    </>
  );
}
