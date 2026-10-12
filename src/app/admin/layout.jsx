'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { ErrorBoundary } from '@/presentation/components/common/ErrorBoundary/ErrorBoundary';
import { MessagesWidget } from '@/presentation/components/common/MessagesWidget/MessagesWidget';

export default function AdminLayout({ children }) {
  return (
    // overflow-x-clip: iOS Safari body'deki overflow-x:hidden'ı yok sayıp sayfayı
    // yatay kaydırabiliyor. clip (hidden değil) scroll container oluşturmaz,
    // window scroll / sticky / fixed navbar etkilenmez.
    <div className="min-h-screen overflow-x-clip bg-[#0F1B2B] text-white font-sans selection:bg-[#FFD700] selection:text-black flex flex-col">
      <Navbar />
      <div className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
      <Footer />
      <MessagesWidget />
    </div>
  );
}
