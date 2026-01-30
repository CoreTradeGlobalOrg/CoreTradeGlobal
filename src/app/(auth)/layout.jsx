import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-radial-auth flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[132px] pb-8 px-4 flex items-start justify-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}
