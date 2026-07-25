'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MessageSquare, CheckCircle, Phone, Mail, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useContactMessage } from '@/presentation/hooks/messaging/useContactMessage';
import { useAuth } from '@/presentation/contexts/AuthContext';

function ContactForm() {
    const searchParams = useSearchParams();
    const { user, isAuthenticated } = useAuth();
    const { sendContactMessage, sending, error, success, reset } = useContactMessage();

    // Get subject from URL query parameter
    const urlSubject = searchParams.get('subject');
    const isAdvertising = urlSubject === 'advertising';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: isAdvertising ? 'Advertising Inquiry' : '',
        message: ''
    });

    // Pre-fill form for authenticated users and handle URL subject
    useEffect(() => {
        if (isAuthenticated && user) {
            setFormData((prev) => ({
                ...prev,
                name: user.displayName || prev.name,
                email: user.email || prev.email,
            }));
        }
    }, [isAuthenticated, user]);

    // Update subject when URL parameter changes
    useEffect(() => {
        if (isAdvertising) {
            setFormData((prev) => ({
                ...prev,
                subject: 'Advertising Inquiry'
            }));
        }
    }, [isAdvertising]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await sendContactMessage({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                tag: isAdvertising ? 'advertising' : 'contact',
            });

            toast.success('Message sent successfully! We will get back to you soon.');
            setFormData({ name: '', email: '', subject: isAdvertising ? 'Advertising Inquiry' : '', message: '' });
        } catch (err) {
            // Check for permission/auth errors and show user-friendly message
            const errorMsg = err.message?.toLowerCase() || '';
            if (errorMsg.includes('permission') || errorMsg.includes('unauthorized') || errorMsg.includes('unauthenticated')) {
                toast.error('You need to login or sign up to use this feature.');
            } else {
                toast.error(err.message || 'Failed to send message. Please try again.');
            }
        }
    };

    return (
        <main className="pt-[calc(var(--navbar-height)+24px)] pb-20 bg-radial-navy">
            {/* Hero Section */}
            <section className="relative w-full flex flex-col justify-center items-center text-center px-5 pb-12 overflow-hidden">
                <h1
                    className="text-5xl md:text-[64px] font-extrabold leading-[1.1] tracking-[-2px] max-w-[900px] mb-5"
                    style={{
                        background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Contact Us
                </h1>
                <p className="text-lg text-[#A0A0A0] max-w-[600px] leading-relaxed">
                    Have questions or need assistance? We're here to help you succeed in global trade.
                </p>
            </section>

            {/* Contact Form + Direct Reach Section */}
            <section className="px-5 pb-10 flex justify-center">
                <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                    <div className="relative overflow-hidden rounded-[20px] p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <MessageSquare className="w-6 h-6 text-[#FFD700]" />
                                <h2 className="text-2xl font-bold text-white">Send us a Message</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
                                        Your Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700] transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
                                        Email Address <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700] transition-colors"
                                        placeholder="john@company.com"
                                    />
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700] transition-colors"
                                        placeholder="How can we help?"
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
                                        Message <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows={5}
                                        className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700] transition-colors resize-none"
                                        placeholder="Tell us more about your inquiry..."
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(255,215,0,0.3)] transition-all disabled:opacity-50"
                                >
                                    {sending ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-[#0F1B2B] border-t-transparent rounded-full animate-spin"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>

                                {/* Info about replies */}
                                {isAuthenticated ? (
                                    <p className="text-center text-sm text-[#64748b] mt-4">
                                        <CheckCircle className="w-4 h-4 inline-block mr-1 text-green-500" />
                                        You're logged in! We'll reply to your messages and you can see them in your inbox.
                                    </p>
                                ) : (
                                    <p className="text-center text-sm text-[#64748b] mt-4">
                                        <a href="/login" className="text-[#FFD700] hover:underline">Log in</a> to see our replies in your inbox, or we'll respond to your email.
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Direct-reach card — WhatsApp CTA + phone/email/address */}
                    <ContactInfoCard />
                </div>
            </section>
        </main>
    );
}

function ContactInfoCard() {
    const waMessage = encodeURIComponent(
        "Hi CoreTradeGlobal, I'd like more info about your platform."
    );
    return (
        <aside className="relative overflow-hidden rounded-[20px] p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
            <h2 className="text-2xl font-bold text-white mb-6">Reach us directly</h2>

            {/* WhatsApp primary CTA */}
            <a
                href={`https://wa.me/48789603272?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] transition-colors no-underline font-semibold shadow-[0_8px_24px_rgba(37,211,102,0.25)]"
            >
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.174.2-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <div className="flex flex-col leading-tight">
                    <span className="text-base">Message on WhatsApp</span>
                    <span className="text-xs opacity-90">+48 789 603 272</span>
                </div>
            </a>

            <div className="my-6 h-px bg-[rgba(255,255,255,0.08)]" />

            {/* Phone / Email / Address */}
            <ul className="space-y-4 text-sm">
                <li>
                    <a href="tel:+48789603272" className="flex items-start gap-3 text-[#cbd5e1] hover:text-[#FFD700] transition-colors no-underline">
                        <Phone className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-0.5">Call</span>
                            <span className="font-medium">+48 789 603 272</span>
                        </div>
                    </a>
                </li>
                <li>
                    <a href="mailto:info@coretradeglobal.com" className="flex items-start gap-3 text-[#cbd5e1] hover:text-[#FFD700] transition-colors no-underline">
                        <Mail className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-0.5">Email</span>
                            <span className="font-medium break-all">info@coretradeglobal.com</span>
                        </div>
                    </a>
                </li>
                <li>
                    <div className="flex items-start gap-3 text-[#cbd5e1]">
                        <MapPin className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs uppercase tracking-wider text-[#A0A0A0] mb-0.5">Office</span>
                            <span className="font-medium">Warsaw, Poland</span>
                        </div>
                    </div>
                </li>
            </ul>

            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] text-xs text-[#FFD700]">
                <Clock className="w-3.5 h-3.5" />
                <span>Replies within 24 hours</span>
            </div>
        </aside>
    );
}

export default function ContactPage() {
    return (
        <Suspense fallback={
            <main className="pt-[calc(var(--navbar-height)+24px)] pb-20 bg-radial-navy flex items-center justify-center min-h-screen">
                <div className="text-white">Loading...</div>
            </main>
        }>
            <ContactForm />
        </Suspense>
    );
}
