import React from 'react';
import Link from 'next/link';
import { Package, Truck, Shield, Scale, BadgeCheck, Search, MessageSquare, CalendarDays, Newspaper } from 'lucide-react';

export const metadata = {
    title: 'About Us | CoreTradeGlobal',
    description: 'CoreTradeGlobal — The Core of the B2B World. An end-to-end B2B trade ecosystem for exporters, importers, and international businesses.',
};

const OFFERINGS = [
    {
        icon: Package,
        title: 'Product Listing & RFQ',
        description: 'Showcase your products to buyers worldwide, or post a Request for Quote to receive comparable offers from multiple suppliers.',
    },
    {
        icon: Truck,
        title: 'Logistics Support',
        description: 'As your trade progresses, logistics providers on the platform are automatically notified and send you live shipping quotes. No brokers, no phone chains.',
    },
    {
        icon: Shield,
        title: 'Insurance Support',
        description: 'Insurance companies are automatically brought in for active trades and send relevant offers — including cargo insurance — directly through the platform.',
    },
    {
        icon: Scale,
        title: 'Legal Advisory',
        description: 'Access expert legal advisors directly through the platform for export documentation, trade compliance, and contract disputes.',
    },
    {
        icon: BadgeCheck,
        title: 'Verified Badge',
        description: 'Every company that joins the platform is manually reviewed by our team. Those that pass verification receive a Verified badge on their profile — guaranteeing every connection is with a real, legitimate business.',
    },
    {
        icon: Search,
        title: 'Powerful Search & Filtering',
        description: 'Find the right supplier or buyer in seconds using country, category, and keyword filters.',
    },
    {
        icon: MessageSquare,
        title: 'Secure Messaging',
        description: 'Our encrypted communication channel supports file, photo, and document sharing — without needing to share personal contact information.',
    },
    {
        icon: CalendarDays,
        title: 'Trade Fairs',
        description: 'Stay up to date with upcoming international trade fairs and industry events relevant to your sector, all in one place.',
    },
    {
        icon: Newspaper,
        title: 'Trade News',
        description: 'Read up-to-date B2B trade news daily.',
    },
];

export default function AboutUsPage() {
    return (
        <main className="pt-[calc(var(--navbar-height)+24px)] pb-20 bg-radial-navy">
            {/* Hero Section */}
            <section className="relative w-full flex flex-col justify-center items-center text-center px-5 pb-20 overflow-hidden">
                <h1
                    className="text-5xl md:text-[64px] font-extrabold leading-[1.1] tracking-[-2px] max-w-[900px] mb-5 text-white"
                >
                    CoreTradeGlobal
                </h1>
                <p className="text-xl text-[#FFD700] font-semibold mb-4">
                    &ldquo;Core of the B2B&rdquo; — The Core of the B2B World
                </p>
                <p className="text-lg text-gray-200 max-w-[700px] leading-relaxed mb-16">
                    CoreTradeGlobal is an end-to-end B2B trade ecosystem that brings exporters, importers, and businesses involved in international trade together on a single platform. We are not just a marketplace — we are an integrated solution that covers every step of trade: product listing, request for quotation, logistics, insurance, and legal support, all under one roof.
                </p>
            </section>

            {/* Who We Are Section */}
            <section className="px-5 pb-16 flex justify-center">
                <div className="w-full max-w-[1200px]">
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
                        <h2 className="text-[28px] font-bold mb-5 relative z-10" style={{ color: '#ffffff' }}>Who We Are</h2>
                        <p className="text-base leading-[1.8] text-gray-200 relative z-10">
                            Our motto is &ldquo;Core of the B2B.&rdquo; This is not just a slogan — it is a commitment that defines the essence of our platform. We are here to enable businesses of all sizes to participate in global trade with confidence, speed, and without intermediaries.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission & Vision Section */}
            <section className="px-5 pb-16 flex justify-center">
                <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Vision Card */}
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
                        <h2 className="text-[32px] font-bold mb-5 flex items-center gap-3 relative z-10 text-white">
                            <svg className="w-8 h-8 text-[#FFD700] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Our Vision
                        </h2>
                        <p className="text-base leading-[1.8] text-gray-200 relative z-10">
                            CoreTradeGlobal&apos;s vision is to eliminate the boundaries of trade by bringing all businesses worldwide together in a single digital core. We aim for companies of every scale to be visible, accessible, and trusted in the global market — and to become the beating heart of B2B commerce in a digitalizing world.
                        </p>
                    </div>

                    {/* Mission Card */}
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
                        <h2 className="text-[32px] font-bold mb-5 flex items-center gap-3 relative z-10 text-white">
                            <svg className="w-8 h-8 text-[#FFD700] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Our Mission
                        </h2>
                        <p className="text-base leading-[1.8] text-gray-200 relative z-10">
                            Our mission is to provide businesses with a secure, fast, and efficient environment where they can trade with one another in the digital age. We enable companies to showcase their products, share their requests, connect with the right partners, and manage the entire process — from logistics to insurance, from legal support to communication — on a single platform.
                        </p>
                    </div>
                </div>
            </section>

            {/* What We Offer Section */}
            <section className="px-5 pb-16 flex justify-center">
                <div className="w-full max-w-[1200px]">
                    <h2
                        className="text-[40px] font-bold text-center mb-12 text-white"
                    >
                        What We Offer
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {OFFERINGS.map((item) => (
                            <div
                                key={item.title}
                                className="relative overflow-hidden rounded-[16px] p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]"
                            >
                                <item.icon className="w-8 h-8 text-[#FFD700] mb-4" strokeWidth={1.5} />
                                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                                <p className="text-sm leading-[1.7] text-gray-200">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why CoreTradeGlobal Section */}
            <section className="px-5 pb-20 flex justify-center">
                <div className="w-full max-w-[1200px]">
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,215,0,0.15)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
                        <h2 className="text-[32px] font-bold mb-5 relative z-10" style={{ color: '#ffffff' }}>Why CoreTradeGlobal?</h2>
                        <p className="text-base leading-[1.8] text-gray-200 relative z-10 mb-6">
                            International trade is full of friction — complex logistics, opaque insurance processes, legal requirements, and trust issues. CoreTradeGlobal solves all of these challenges on a single platform. You can trade without relying on intermediaries, endless email threads, or business partners whose credibility is uncertain.
                        </p>
                        <p className="text-base leading-[1.8] text-[#FFD700] font-medium relative z-10">
                            Joining the platform does not require any payment. Create your company profile, list your products, and become part of a global trade network.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="px-5 pb-10 flex justify-center">
                <div className="w-full max-w-[600px] text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
                    <p className="text-gray-200 mb-8">Join thousands of businesses already trading on CoreTradeGlobal.</p>
                    <a
                        href="/register"
                        style={{ color: '#000', WebkitTextFillColor: '#000' }}
                        className="inline-block px-10 py-4 bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-lg rounded-full shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:-translate-y-1 transition-all duration-300 no-underline"
                    >
                        Sign Up for Free
                    </a>
                </div>
            </section>
        </main>
    );
}
