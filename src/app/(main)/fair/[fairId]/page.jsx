/**
 * Fair Detail Page
 *
 * URL: /fair/[fairId]
 * Public page showing fair/event details
 */

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { container } from '@/core/di/container';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, MapPin, Calendar, Clock, Globe, Users, ExternalLink } from 'lucide-react';

export default function FairDetailPage() {
    const router = useRouter();
    const params = useParams();
    const fairId = params.fairId;

    const [fair, setFair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFair = async () => {
            try {
                const fairsRepo = container.getFairsRepository();
                const fetchedFair = await fairsRepo.getById(fairId);
                if (fetchedFair) {
                    setFair(fetchedFair);
                } else {
                    setError('Fair not found');
                }
            } catch (err) {
                console.error('Error fetching fair:', err);
                setError('Failed to load fair details');
            } finally {
                setLoading(false);
            }
        };

        if (fairId) {
            fetchFair();
        }
    }, [fairId]);

    const formatDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatShortDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ongoing':
                return (
                    <span className="px-4 py-2 text-sm font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        🟢 Ongoing Now
                    </span>
                );
            case 'upcoming':
                return (
                    <span className="px-4 py-2 text-sm font-bold rounded-full bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30">
                        📅 Upcoming
                    </span>
                );
            case 'past':
                return (
                    <span className="px-4 py-2 text-sm font-bold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        ✓ Completed
                    </span>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#0a1628]">
                <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !fair) {
        return (
            <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy flex items-center justify-center px-4">
                <div className="glass-card max-w-lg w-full p-8 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Fair Not Found</h2>
                    <p className="text-gray-400 mb-6">The fair you're looking for doesn't exist or has been removed.</p>
                    <Button onClick={() => router.push('/fairs')} className="btn-signup text-white border-none w-full max-w-[200px]">
                        Browse Fairs
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy">
            <div className="max-w-[1200px] mx-auto px-4">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Fairs</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <div className="glass-card p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/10 blur-[80px] rounded-full pointer-events-none" />

                            <div className="relative z-10">
                                {/* Title + Status Badge Row */}
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                        {fair.name}
                                    </h1>
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(fair.status)}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="inline-block mb-4">
                                    <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider bg-[rgba(255,215,0,0.1)] px-4 py-2 rounded-full">
                                        {fair.category || 'Trade Fair'}
                                    </span>
                                </div>

                                {/* Location and Date */}
                                <div className="flex flex-wrap gap-6 text-[#A0A0A0]">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-[#FFD700]" />
                                        <span className="text-lg">{fair.location || 'Location TBA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#FFD700]" />
                                        <span className="text-lg">
                                            {fair.startDate && fair.endDate ? (
                                                `${formatShortDate(fair.startDate)} - ${formatShortDate(fair.endDate)}`
                                            ) : fair.date ? (
                                                `${fair.date} ${fair.month} ${fair.year}`
                                            ) : (
                                                'Date TBA'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description Card */}
                        <div className="glass-card p-8">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4 flex items-center gap-2">
                                About This Event
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg font-light">
                                {fair.description || 'More details about this trade fair will be announced soon. Stay tuned for updates on exhibitors, speakers, and networking opportunities.'}
                            </p>
                        </div>

                        {/* Additional Info */}
                        {(fair.venue || fair.organizer || fair.website) && (
                            <div className="glass-card p-8">
                                <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-6">
                                    Event Details
                                </div>
                                <div className="space-y-4">
                                    {fair.venue && (
                                        <div className="flex items-start gap-4">
                                            <MapPin className="w-5 h-5 text-[#FFD700] mt-1" />
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Venue</div>
                                                <div className="text-white">{fair.venue}</div>
                                            </div>
                                        </div>
                                    )}
                                    {fair.organizer && (
                                        <div className="flex items-start gap-4">
                                            <Users className="w-5 h-5 text-[#FFD700] mt-1" />
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Organizer</div>
                                                <div className="text-white">{fair.organizer}</div>
                                            </div>
                                        </div>
                                    )}
                                    {fair.website && (
                                        <div className="flex items-start gap-4">
                                            <Globe className="w-5 h-5 text-[#FFD700] mt-1" />
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Website</div>
                                                <a
                                                    href={fair.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#FFD700] hover:underline flex items-center gap-1"
                                                >
                                                    {fair.website}
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Date Card */}
                        <div className="glass-card p-6">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4">
                                Event Schedule
                            </div>

                            {fair.startDate && (
                                <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Start Date</div>
                                    <div className="text-white font-medium">{formatDate(fair.startDate)}</div>
                                </div>
                            )}

                            {fair.endDate && (
                                <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">End Date</div>
                                    <div className="text-white font-medium">{formatDate(fair.endDate)}</div>
                                </div>
                            )}

                            {fair.openingHours && (
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Opening Hours</div>
                                    <div className="flex items-center gap-2 text-white">
                                        <Clock className="w-4 h-4 text-[#FFD700]" />
                                        {fair.openingHours}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CTA Card */}
                        {fair.website && (
                            <div className="glass-card p-6">
                                <div className="text-center">
                                    <p className="text-gray-400 mb-4 text-sm">
                                        Interested in attending? Visit the official website for registration and more information.
                                    </p>
                                    <a
                                        href={fair.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-3 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all text-center"
                                    >
                                        Visit Official Website
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Quick Info */}
                        <div className="glass-card p-6">
                            <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4">
                                Quick Info
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Category</span>
                                    <span className="text-white font-medium">{fair.category || 'Trade Fair'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Location</span>
                                    <span className="text-white font-medium">{fair.location || 'TBA'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`font-medium ${
                                        fair.status === 'ongoing' ? 'text-green-400' :
                                        fair.status === 'upcoming' ? 'text-[#FFD700]' : 'text-gray-400'
                                    }`}>
                                        {fair.status?.charAt(0).toUpperCase() + fair.status?.slice(1) || 'TBA'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
