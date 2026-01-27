'use client';

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import './homepage.css';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
