'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0F1B2B] text-white font-sans selection:bg-[#FFD700] selection:text-black flex flex-col">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
