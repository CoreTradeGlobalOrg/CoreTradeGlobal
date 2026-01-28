'use client';

import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [sending, setSending] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSending(true);

        // TODO: Connect to in-app messaging system
        // Messages will be sent to admin with "contact" tag
        setTimeout(() => {
            toast.success('Message sent successfully! We will get back to you soon.');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setSending(false);
        }, 1500);
    };

    return (
        <main className="pt-[120px] pb-20 bg-radial-navy">
            {/* Hero Section */}
            <section className="relative w-full flex flex-col justify-center items-center text-center px-5 py-12 overflow-hidden">
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

            {/* Contact Form Section */}
            <section className="px-5 pb-10 flex justify-center">
                <div className="w-full max-w-[600px]">
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
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
