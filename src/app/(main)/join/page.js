'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Globe, TrendingUp, Handshake, Truck, Shield, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { RegisterForm } from '@/presentation/components/features/auth/RegisterForm/RegisterForm';
import { FeaturedProducts } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

const STATS = [
  {
    icon: Users,
    title: 'No Fees, No Commission',
    desc: 'Completely free. Trade free. No hidden costs at any step.',
  },
  {
    icon: Globe,
    title: 'Showcase Globally',
    desc: 'Upload your products to reach international buyers',
  },
  {
    icon: TrendingUp,
    title: 'Find New Customers',
    desc: 'Connect directly and grow your global business',
  },
];

const BENEFITS = [
  {
    icon: Handshake,
    title: 'Start & Manage Deals',
    desc: 'Initiate deals directly for the products you find and manage all your trade steps seamlessly on our platform.',
  },
  {
    icon: Truck,
    title: 'Live Shipping Quotes',
    desc: 'Get instant, live shipping quotes from leading logistics providers to move your goods globally.',
  },
  {
    icon: Shield,
    title: 'Cargo Insurance',
    desc: 'Secure your goods in transit by obtaining live insurance policies directly from trusted providers on our platform.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Within 2 weeks of joining CoreTradeGlobal, we received 14 qualified RFQs from Europe. The supplier verification gave our buyers confidence from day one.',
    author: 'Ahmet Y.',
    info: 'Export Manager · Istanbul, Turkey',
  },
  {
    quote: 'Finding verified manufacturers used to take weeks. With CoreTradeGlobal, we listed our RFQ and received 8 comparable quotes within 24 hours.',
    author: 'Marcus K.',
    info: 'Purchasing Director · Frankfurt, Germany',
  },
  {
    quote: 'As a small manufacturing firm, global marketing was out of our budget. Listing our products here put us in front of buyers from the UK and UAE.',
    author: 'Priya S.',
    info: 'Managing Director · Mumbai, India',
  },
  {
    quote: 'The end-to-end support is a game-changer. Being able to secure cargo shipping quotes and chat directly with verified buyers on the same platform streamlined our entire export operation.',
    author: 'Sarah L.',
    info: 'Operations Head · Dubai, UAE',
  },
  {
    quote: 'We needed a reliable supplier for organic textiles. CoreTradeGlobal matched us with a vetted manufacturer in Turkey. The built-in secure chat made negotiating terms effortless.',
    author: 'James O.',
    info: 'Sourcing Lead · London, UK',
  },
  {
    quote: 'Expanding our industrial machinery sales into Eastern Europe was challenging. Through the platform, we connected with verified distributors in Poland and Romania.',
    author: 'Wang T.',
    info: 'Sales Director · Guangzhou, China',
  },
];

function TestimonialSlider({ items }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const cardWidth = trackRef.current.firstChild?.offsetWidth || 340;
    trackRef.current.scrollBy({ left: dir === 'left' ? -cardWidth - 16 : cardWidth + 16, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A283B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white hover:border-[#FFD700] hover:text-[#FFD700] transition-colors hidden md:flex"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A283B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white hover:border-[#FFD700] hover:text-[#FFD700] transition-colors hidden md:flex"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
      >
        {items.map((t, i) => (
          <div
            key={t.id || i}
            className="flex-shrink-0 w-[400px] snap-start rounded-[20px] p-6 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] flex flex-col justify-between"
          >
            <div>
              <div className="flex gap-0.5 text-[#FFD700] mb-3">
                {[...Array(t.rating || 5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#FFD700]" />
                ))}
              </div>
              <blockquote className="text-[15px] text-[#cbd5e1] leading-relaxed italic mb-4">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">— {t.author}</p>
              <p className="text-xs text-[#A0A0A0]">{t.info}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JoinPage() {
  const [testimonials, setTestimonials] = useState(TESTIMONIALS);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const q = query(
          collection(db, 'testimonials'),
          where('active', '==', true),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          setTestimonials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
        // Fallback to hardcoded
      }
    };
    fetchTestimonials();
  }, []);

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] bg-radial-navy">

      {/* ── Hero Section ── */}
      <section className="px-5 pb-6 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-[56px] font-extrabold leading-[1.1] tracking-[-2px] max-w-[800px] mb-4 text-white">
          The Global{' '}
          <span className="bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
            B2B Trade Ecosystem
          </span>
        </h1>
        <p className="text-lg text-[#A0A0A0] max-w-[600px] mb-10">
          Connecting importers and exporters with integrated logistics and transit insurance.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[800px] w-full mb-12">
          {STATS.map((s) => (
            <div
              key={s.title}
              className="rounded-[16px] p-5 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] text-center"
            >
              <s.icon className="w-8 h-8 text-[#FFD700] mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-white font-bold text-base mb-1">{s.title}</h3>
              <p className="text-[#A0A0A0] text-sm">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Register Form */}
        <div
          id="register-form"
          className="w-full max-w-[500px] scroll-mt-[calc(var(--navbar-height)+16px)]"
        >
          <Suspense fallback={<div className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </section>

      {/* ── About Section ── */}
      <section className="px-5 py-8 flex justify-center">
        <div className="w-full max-w-[1100px]">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-[40px] font-extrabold mb-4"
              style={{
                background: 'linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              The Core of the B2B World
            </h2>
            <p className="text-[#A0A0A0] max-w-[700px] mx-auto leading-relaxed">
              <strong className="text-white">CoreTradeGlobal</strong> is an <strong className="text-white">end-to-end B2B trade ecosystem</strong> bringing exporters, importers, and international businesses together on a single digital platform.
            </p>
          </div>

        </div>
      </section>

      {/* Featured Products carousel — same component used on the homepage,
          so visitors landing on /join immediately see what's actually
          trading on the platform right below the platform pitch. */}
      <FeaturedProducts />

      {/* ── Benefits Section ── */}
      <section className="px-5 py-8 flex justify-center">
        <div className="w-full max-w-[1100px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-[20px] p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] text-center transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]"
              >
                <b.icon className="w-10 h-10 text-[#FFD700] mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-bold mb-3" style={{ background: 'linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{b.title}</h3>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section className="px-5 py-8 flex justify-center">
        <div className="w-full max-w-[1100px]">
          <h2
            className="text-3xl md:text-[40px] font-extrabold text-center mb-10"
            style={{
              background: 'linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Success Stories
          </h2>
          <TestimonialSlider items={testimonials} />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-8 flex justify-center">
        <div className="w-full max-w-[600px] text-center">
          <h2
            className="text-3xl md:text-[40px] font-extrabold mb-4"
            style={{
              background: 'linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ready to trade globally?
          </h2>
          <p className="text-[#A0A0A0] mb-8">
            Free to join. No setup fees. Start connecting with verified partners today.
          </p>
          <a
            href="#register-form"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('register-form')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ color: '#000', WebkitTextFillColor: '#000' }}
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-lg rounded-full shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:-translate-y-1 transition-all duration-300 no-underline"
          >
            Get Started Free
          </a>
        </div>
      </section>
    </main>
  );
}
