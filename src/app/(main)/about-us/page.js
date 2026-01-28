import React from 'react';

export const metadata = {
    title: 'About Us | CoreTradeGlobal',
    description: 'Learn about our mission to revolutionize global trade.',
};

export default function AboutUsPage() {
    return (
        <main className="pt-[120px] pb-20 bg-radial-navy">
            {/* Hero Section */}
            <section className="relative w-full flex flex-col justify-center items-center text-center px-5 py-20 overflow-hidden">
                <h1
                    className="text-5xl md:text-[64px] font-extrabold leading-[1.1] tracking-[-2px] max-w-[900px] mb-5"
                    style={{
                        background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Revolutionizing<br />Global Trade
                </h1>
                <p className="text-lg text-[#A0A0A0] max-w-[600px] leading-relaxed mb-16">
                    We are bridging the gap between manufacturers and buyers with AI-driven technology, making B2B commerce seamless, secure, and efficient.
                </p>
            </section>

            {/* Mission & Vision Section */}
            <section className="px-5 pb-20 flex justify-center">
                <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Mission Card */}
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
                        <h2 className="text-[32px] font-bold text-white mb-5 flex items-center gap-3 relative z-10">
                            <svg className="w-8 h-8 text-[#FFD700] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Our Mission
                        </h2>
                        <p className="text-base leading-[1.8] text-[#cbd5e1] relative z-10">
                            To democratize global trade by providing a transparent, secure, and intelligent platform where businesses of all sizes can connect, negotiate, and transact without borders. We aim to remove the friction from B2B commerce through verified networks and smart logistics solutions.
                        </p>
                    </div>

                    {/* Vision Card */}
                    <div className="relative overflow-hidden rounded-[20px] p-10 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,215,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.2)]">
                        <h2 className="text-[32px] font-bold text-white mb-5 flex items-center gap-3 relative z-10">
                            <svg className="w-8 h-8 text-[#FFD700] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Our Vision
                        </h2>
                        <p className="text-base leading-[1.8] text-[#cbd5e1] relative z-10">
                            To become the world&apos;s most trusted digital ecosystem for industrial trade, defining the future of supply chains where AI matches the right buyer with the right seller instantly, reducing waste and increasing global economic prosperity.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
