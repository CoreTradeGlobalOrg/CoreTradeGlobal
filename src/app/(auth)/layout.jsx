import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-radial-auth flex flex-col">
      <Navbar />
      <main className="flex-1 pt-[100px] pb-20 px-4 flex items-center justify-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}
