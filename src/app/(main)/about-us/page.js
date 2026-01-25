import React from 'react';
import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';

export const metadata = {
    title: 'About Us | CoreTradeGlobal',
    description: 'Learn about our mission to revolutionize global trade.',
};

export default function AboutUsPage() {
    return (
        <div className="bg-[var(--color-bg-base)] min-h-screen text-[var(--color-text-primary)]">
            <Navbar />

            <main className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto">
                {/* Hero Section */}
                <section className="mb-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[var(--color-primary)]">
                        About CoreTradeGlobal
                    </h1>
                    <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
                        We are revolutionizing B2B trade by connecting verified suppliers with global buyers through advanced technology and secure infrastructure.
                    </p>
                </section>

                {/* Vision & Mission */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                    <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl border border-[var(--color-border)]">
                        <div className="text-4xl mb-4">🎯</div>
                        <h2 className="text-2xl font-bold mb-4 text-[#F5F5F5]">Our Mission</h2>
                        <p className="text-[var(--color-text-secondary)] leading-relaxed">
                            To democratize global trade by providing equal opportunities for businesses of all sizes. We aim to remove barriers, reduce risks, and streamline the procurement process through transparency and trust.
                        </p>
                    </div>

                    <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl border border-[var(--color-border)]">
                        <div className="text-4xl mb-4">🔭</div>
                        <h2 className="text-2xl font-bold mb-4 text-[#F5F5F5]">Our Vision</h2>
                        <p className="text-[var(--color-text-secondary)] leading-relaxed">
                            To become the world&apos;s most trusted digital trade ecosystem where quality meets demand instantly. We envision a future where borders are just lines on a map, not obstacles to business.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <section className="bg-[var(--color-bg-tertiary)] rounded-3xl p-12 mb-20 border border-[var(--color-border)]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-[var(--color-primary)] mb-2">15K+</div>
                            <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider">Active Buyers</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-[var(--color-primary)] mb-2">120+</div>
                            <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider">Countries</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-[var(--color-primary)] mb-2">$500M+</div>
                            <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider">Trade Volume</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-[var(--color-primary)] mb-2">24/7</div>
                            <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wider">Support</div>
                        </div>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section className="mb-20">
                    <h2 className="text-3xl font-bold mb-10 text-center">Why Choose Us?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="bg-[rgba(212,175,55,0.1)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                                🛡️
                            </div>
                            <h3 className="text-xl font-bold mb-3">Verified Partners</h3>
                            <p className="text-[var(--color-text-secondary)]">Every supplier is manually verified to ensure high standards and trust.</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="bg-[rgba(212,175,55,0.1)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                                🤖
                            </div>
                            <h3 className="text-xl font-bold mb-3">AI Matching</h3>
                            <p className="text-[var(--color-text-secondary)]">Smart algorithms connect you with the most relevant business partners.</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="bg-[rgba(212,175,55,0.1)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                                💳
                            </div>
                            <h3 className="text-xl font-bold mb-3">Secure Payments</h3>
                            <p className="text-[var(--color-text-secondary)]">Integrated escrow services to protect both buyers and sellers.</p>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] p-12 rounded-3xl border border-[var(--color-border)]">
                    <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
                    <p className="text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
                        Join thousands of successful companies trading on CoreTradeGlobal today.
                    </p>
                    <a
                        href="/register"
                        className="inline-block px-8 py-4 bg-[var(--color-primary)] text-[var(--color-bg-base)] font-bold rounded-full hover:bg-[var(--color-primary-light)] transition-all transform hover:-translate-y-1 shadow-[0_10px_30px_rgba(212,175,55,0.3)]"
                    >
                        Start for Free
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
}
