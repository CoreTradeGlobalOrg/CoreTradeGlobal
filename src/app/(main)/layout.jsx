'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
