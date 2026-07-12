/**
 * Ad Placement Inquiry Form
 *
 * URL: /pricing/inquire[?type=featured|hero|carousel]
 *
 * The `?type` query param preselects the corresponding ad package. On
 * submit we write directly to Firestore `adInquiries/{autoId}` — a
 * `notifyAdminsOnAdInquiry` Cloud Function then fans out in-app
 * notifications + a branded email to every admin.
 *
 * Client-side spam guards:
 *   - 60-second cooldown per browser via localStorage (also prevents
 *     accidental double-submits).
 *   - Website URL is auto-prefixed with https:// if the user omits it —
 *     same behaviour as the profile edit form.
 * Server-side Firestore rules enforce shape, size limits, and the
 * `status: 'new'` + `createdAt == request.time` invariants.
 *
 * On success we route to /pricing/inquire/thank-you which surfaces a
 * confirmation + next-steps CTAs.
 */

'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';

const PACKAGES = [
  { value: 'Featured Product Directory Spot', short: 'Featured Products', price: 100, unit: '/week' },
  { value: 'Hero Section Spotlight Ad', short: 'Hero Spotlight', price: 100, unit: '/week' },
  { value: 'Carousel Banner Placement', short: 'Carousel Brand', price: 100, unit: '/week' },
  { value: 'Combined Multi-Placement Package', short: 'Combined Multi-Placement', price: 200, unit: '/week' },
];

// Map ?type= query param to a package value so pricing-page tile CTAs
// land the user on this form with their choice already selected.
const TYPE_TO_PACKAGE = {
  featured: 'Featured Product Directory Spot',
  hero: 'Hero Section Spotlight Ad',
  carousel: 'Carousel Banner Placement',
  combined: 'Combined Multi-Placement Package',
};

// Rolling six-month window starting on the current month. Simpler to
// hard-code + label from Date than to run a full i18n locale-aware
// picker for a marketing form.
const CAMPAIGN_WEEKS = [
  'Week 1 (01-07)',
  'Week 2 (08-14)',
  'Week 3 (15-21)',
  'Week 4 (22-28)',
];

const RATE_LIMIT_KEY = 'ad_inquiry_last_submit_at';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function computeMonths() {
  const months = [];
  const now = new Date();
  const monthName = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(monthName(d));
  }
  return months;
}

function normalizeUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function InquirePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPackage = TYPE_TO_PACKAGE[searchParams.get('type')] || PACKAGES[0].value;
  const months = useMemo(() => computeMonths(), []);

  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [pkg, setPkg] = useState(initialPackage);
  const [campaignMonth, setCampaignMonth] = useState(months[0]);
  const [campaignWeek, setCampaignWeek] = useState(CAMPAIGN_WEEKS[0]);
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const firstErrorRef = useRef(null);

  // Keep the package field in sync when the user changes ?type= via nav.
  useEffect(() => {
    const q = searchParams.get('type');
    if (q && TYPE_TO_PACKAGE[q]) setPkg(TYPE_TO_PACKAGE[q]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('type')]);

  const validate = () => {
    const e = {};
    if (!company.trim()) e.company = 'Company name is required.';
    if (!contactName.trim()) e.contactName = 'Contact name is required.';
    if (!email.trim() || !EMAIL_RE.test(email.trim())) e.email = 'A valid business email is required.';
    if (!website.trim()) e.website = 'Company website is required.';
    if (!pkg) e.pkg = 'Select an ad placement.';
    if (!campaignMonth) e.campaignMonth = 'Pick a campaign month.';
    if (!campaignWeek) e.campaignWeek = 'Pick a campaign week.';
    if (brief.length > 2000) e.brief = 'Brief must be under 2000 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) return;

    // Rate limit — hydration-safe check that also survives page reloads.
    try {
      const raw = window.localStorage.getItem(RATE_LIMIT_KEY);
      if (raw) {
        const last = Number(raw);
        if (Number.isFinite(last) && Date.now() - last < RATE_LIMIT_WINDOW_MS) {
          toast.error('You just submitted an inquiry — please wait a minute before trying again.');
          return;
        }
      }
    } catch {
      // localStorage disabled — soft-fail; server-side rules still enforce shape.
    }

    if (!validate()) {
      // Scroll to first error for UX on long forms.
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'adInquiries'), {
        company: company.trim(),
        website: normalizeUrl(website),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        package: pkg,
        campaignMonth,
        campaignWeek,
        brief: brief.trim(),
        status: 'new',
        createdAt: Timestamp.now(),
      });
      try {
        window.localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
      } catch {
        // ignore quota / privacy-mode errors
      }
      router.push('/pricing/inquire/thank-you');
    } catch (err) {
      console.error('adInquiry create failed:', err);
      toast.error('Something went wrong sending the inquiry. Please try again.');
      setSubmitting(false);
    }
  };

  const fieldClasses = (fieldError) =>
    `w-full bg-[rgba(255,255,255,0.05)] border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors ${
      fieldError ? 'border-red-400/60' : 'border-[rgba(255,255,255,0.1)]'
    }`;

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-3xl mx-auto px-5">
        <Link
          href="/pricing#advertising"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 transition-colors no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Pricing
        </Link>

        <div className="mb-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] text-[#FFD700] text-xs uppercase tracking-wider font-semibold mb-3">
            Advertising Inquiry
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Submit Placement Inquiry</h1>
          <p className="text-[#c8d3e0] text-base max-w-xl mx-auto">
            Tell us about your campaign and our team will get back to you within 1 business day.
          </p>
        </div>

        {/* Price banner reflecting the currently-selected package */}
        <PriceBanner pkg={pkg} />


        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-6 md:p-8 space-y-6"
        >
          {/* Company + Website row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={errors.company ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. CoreTrade International"
                maxLength={200}
                className={fieldClasses(errors.company)}
              />
              {errors.company && <p className="text-xs text-red-400 mt-1">{errors.company}</p>}
            </div>
            <div ref={!errors.company && errors.website ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Company Website <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.mycompany.com"
                maxLength={500}
                className={fieldClasses(errors.website)}
              />
              {errors.website && <p className="text-xs text-red-400 mt-1">{errors.website}</p>}
            </div>
          </div>

          {/* Contact + Email row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={!errors.company && !errors.website && errors.contactName ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Contact Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. John Doe"
                maxLength={200}
                className={fieldClasses(errors.contactName)}
              />
              {errors.contactName && <p className="text-xs text-red-400 mt-1">{errors.contactName}</p>}
            </div>
            <div ref={!errors.company && !errors.website && !errors.contactName && errors.email ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Business Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketing@mycompany.com"
                maxLength={254}
                className={fieldClasses(errors.email)}
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Ad Placement */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Select Ad Placement <span className="text-red-400">*</span>
            </label>
            <select
              value={pkg}
              onChange={(e) => setPkg(e.target.value)}
              className={fieldClasses(errors.pkg)}
            >
              {PACKAGES.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#0F1B2B]">
                  {p.value}
                </option>
              ))}
            </select>
            {errors.pkg && <p className="text-xs text-red-400 mt-1">{errors.pkg}</p>}
          </div>

          {/* Campaign Month — pill tab picker */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Select Campaign Month <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {months.map((m) => {
                const selected = campaignMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCampaignMonth(m)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      selected
                        ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                        : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.5)]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            {errors.campaignMonth && <p className="text-xs text-red-400 mt-1">{errors.campaignMonth}</p>}
          </div>

          {/* Campaign Week — pill radio */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Sponsoring Week (7-Day Placement Block) <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAMPAIGN_WEEKS.map((w) => {
                const selected = campaignWeek === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setCampaignWeek(w)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      selected
                        ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                        : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.5)]'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            {errors.campaignWeek && <p className="text-xs text-red-400 mt-1">{errors.campaignWeek}</p>}
          </div>

          {/* Brief */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Campaign Objectives &amp; Special Requirements
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Tell us about your goals, target industries, creative direction, or anything else that helps our team prepare."
              rows={5}
              maxLength={2000}
              className={fieldClasses(errors.brief) + ' resize-y'}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.brief && <p className="text-xs text-red-400">{errors.brief}</p>}
              <p className="text-xs text-[#A0A0A0] ml-auto">{brief.length}/2000</p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              style={{ color: submitting ? undefined : '#0F1B2B', WebkitTextFillColor: submitting ? undefined : '#0F1B2B' }}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-base hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending inquiry…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Placement Inquiry
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-xs text-[#A0A0A0] text-center mt-3">
              By submitting, you agree that our team may contact you about your inquiry.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

function PriceBanner({ pkg }) {
  const meta = PACKAGES.find((p) => p.value === pkg);
  if (!meta) return null;
  return (
    <div className="mb-6 rounded-2xl border border-[rgba(255,215,0,0.3)] bg-gradient-to-br from-[rgba(255,215,0,0.08)] to-[rgba(253,185,49,0.03)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">Selected placement</p>
        <p className="text-white font-bold text-base">{meta.short}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
          ${meta.price}
        </span>
        <span className="text-[#A0A0A0] text-sm font-semibold">{meta.unit}</span>
      </div>
    </div>
  );
}

export default function InquirePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#A0A0A0] text-sm">Loading…</p>
        </div>
      }
    >
      <InquirePageInner />
    </Suspense>
  );
}
