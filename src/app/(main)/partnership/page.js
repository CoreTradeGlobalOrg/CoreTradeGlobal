/**
 * Become a Partner
 *
 * URL: /partnership (linked from the footer)
 *
 * Public form, no sign-in needed: most partner candidates are not members
 * yet. Signed-in members get their name, company and email filled in.
 * The request is written straight to `partnerRequests` (firestore.rules
 * validates every field); notifyAdminsOnPartnerRequest then emails the
 * admins and sends the applicant a confirmation. Admins work the requests
 * in the admin dashboard's Partner Requests tab.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Handshake, Send, CheckCircle2, Mail, ClipboardCheck, MessageSquare, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { COUNTRIES } from '@/core/constants/countries';
import { PARTNER_TYPES, PARTNER_REQUEST_LIMITS as LIMITS } from '@/core/constants/partnerRequests';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';

const RATE_LIMIT_KEY = 'partner_request_last_submit_at';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700] transition-colors';

const EMPTY_FORM = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  country: '',
  website: '',
  partnerType: '',
  message: '',
  consent: false,
  // Honeypot: hidden from people, bots fill it in.
  fax: '',
};

function normalizeUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Please enter your name.';
  if (!form.company.trim()) errors.company = 'Please enter your company name.';
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!form.country) errors.country = 'Please select your country.';
  if (!form.partnerType) errors.partnerType = 'Please choose a partnership type.';
  if (!form.message.trim()) errors.message = 'Please tell us a little about your proposal.';
  if (!form.consent) errors.consent = 'Please accept so we can contact you about this request.';
  return errors;
}

export default function PartnershipPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { fullName, email } once sent

  // Fill what we know about a signed-in member, never overwriting typing.
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.displayName || '',
      company: prev.company || user.companyName || '',
      email: prev.email || user.email || '',
      country: prev.country || (COUNTRIES.some((c) => c.value === user.country) ? user.country : ''),
    }));
  }, [user]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please check the highlighted fields.');
      return;
    }

    const sent = { fullName: form.fullName.trim(), email: form.email.trim() };

    // Bot filled the hidden field: act as if it worked, store nothing.
    if (form.fax) {
      setSubmitted(sent);
      return;
    }

    try {
      const last = Number(window.localStorage.getItem(RATE_LIMIT_KEY));
      if (Number.isFinite(last) && Date.now() - last < RATE_LIMIT_WINDOW_MS) {
        toast.error('You just sent a request. Please wait a minute before trying again.');
        return;
      }
    } catch {
      // localStorage unavailable; firestore.rules still validate the request.
    }

    const payload = {
      fullName: sent.fullName.slice(0, LIMITS.name),
      company: form.company.trim().slice(0, LIMITS.company),
      email: sent.email,
      country: form.country,
      partnerType: form.partnerType,
      message: form.message.trim().slice(0, LIMITS.message),
      status: 'new',
      // Must be serverTimestamp(): the rule checks createdAt == request.time.
      createdAt: serverTimestamp(),
    };
    const phone = form.phone.trim();
    if (phone) payload.phone = phone.slice(0, LIMITS.phone);
    const website = normalizeUrl(form.website);
    if (website) payload.website = website.slice(0, LIMITS.website);
    if (user?.uid) payload.userId = user.uid;

    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.PARTNER_REQUESTS), payload);
      try {
        window.localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
      } catch {
        // ignore quota / privacy-mode errors
      }
      setSubmitted(sent);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('partner request submit failed:', err);
      toast.error('We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-20 bg-radial-navy">
      {/* Hero */}
      <section className="relative w-full flex flex-col justify-center items-center text-center px-5 pb-12">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(255,215,0,0.12)] border border-[rgba(255,215,0,0.35)] flex items-center justify-center mb-5">
          <Handshake className="w-7 h-7 text-[#FFD700]" />
        </div>
        <h1
          className="text-5xl md:text-[64px] font-extrabold leading-[1.1] tracking-[-2px] max-w-[900px] mb-5"
          style={{
            background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Become a Partner
        </h1>
        <p className="text-lg text-[#A0A0A0] max-w-[640px] leading-relaxed">
          Grow with CoreTradeGlobal. Whether you move goods, insure trade, build technology or know the
          companies in your market, tell us how you&apos;d like to work together.
        </p>
      </section>

      <section className="px-5 pb-10 flex justify-center">
        <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="rounded-[20px] p-6 md:p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
            {submitted ? (
              <SuccessState fullName={submitted.fullName} email={submitted.email} />
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <MessageSquare className="w-6 h-6 text-[#FFD700]" />
                  <h2 className="text-2xl font-bold text-white">Partnership Request</h2>
                </div>

                {/* Partnership type */}
                <div>
                  <p className="block text-sm font-medium text-[#A0A0A0] mb-2">
                    Partnership type <span className="text-red-400">*</span>
                  </p>
                  <div role="radiogroup" aria-label="Partnership type" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PARTNER_TYPES.map((t) => {
                      const selected = form.partnerType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setField('partnerType', t.value)}
                          className={`text-left rounded-xl border px-4 py-3 transition-all ${
                            selected
                              ? 'border-[#FFD700] bg-[rgba(255,215,0,0.1)]'
                              : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,215,0,0.4)]'
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${selected ? 'text-[#FFD700]' : 'text-white'}`}>
                            {t.label}
                          </span>
                          <span className="block text-xs text-[#A0A0A0] mt-0.5">{t.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.partnerType} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Full Name" required error={errors.fullName}>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setField('fullName', e.target.value)}
                      maxLength={LIMITS.name}
                      autoComplete="name"
                      className={`${INPUT_CLASS} ${errors.fullName ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
                      placeholder="John Doe"
                    />
                  </Field>
                  <Field label="Company" required error={errors.company}>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setField('company', e.target.value)}
                      maxLength={LIMITS.company}
                      autoComplete="organization"
                      className={`${INPUT_CLASS} ${errors.company ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
                      placeholder="Company Ltd."
                    />
                  </Field>
                  <Field label="Email Address" required error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      maxLength={LIMITS.email}
                      autoComplete="email"
                      className={`${INPUT_CLASS} ${errors.email ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
                      placeholder="john@company.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      maxLength={LIMITS.phone}
                      autoComplete="tel"
                      className={`${INPUT_CLASS} border-[rgba(255,255,255,0.1)]`}
                      placeholder="+1 555 123 4567"
                    />
                  </Field>
                  <Field label="Country" required error={errors.country}>
                    <SearchableSelect
                      options={COUNTRIES}
                      value={form.country}
                      onChange={(value) => setField('country', value)}
                      placeholder="Select your country"
                      searchPlaceholder="Search countries..."
                      error={!!errors.country}
                      showFlags
                      className="dark-select"
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      type="text"
                      inputMode="url"
                      value={form.website}
                      onChange={(e) => setField('website', e.target.value)}
                      maxLength={LIMITS.website}
                      autoComplete="url"
                      className={`${INPUT_CLASS} border-[rgba(255,255,255,0.1)]`}
                      placeholder="www.company.com"
                    />
                  </Field>
                </div>

                <Field label="Your Proposal" required error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={(e) => setField('message', e.target.value)}
                    rows={5}
                    maxLength={LIMITS.message}
                    className={`${INPUT_CLASS} resize-none ${errors.message ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
                    placeholder="Tell us about your company, the markets you work in and how you'd like to partner with us."
                  />
                  <p className="text-right text-xs text-[#64748b] mt-1">
                    {form.message.length}/{LIMITS.message}
                  </p>
                </Field>

                {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
                <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                  <label>
                    Fax
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.fax}
                      onChange={(e) => setField('fax', e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => setField('consent', e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#FFD700] flex-shrink-0"
                    />
                    <span className="text-sm text-[#A0A0A0] leading-relaxed">
                      CoreTradeGlobal may contact me about this request and keep my details as described in the{' '}
                      <Link href="/privacy-policy" className="text-[#FFD700] hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  <FieldError message={errors.consent} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(255,215,0,0.3)] transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-[#0F1B2B] border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Request
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <NextStepsCard />
        </div>
      </section>
    </main>
  );
}

function Field({ label, required = false, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1.5">{message}</p>;
}

function SuccessState({ fullName, email }) {
  const firstName = fullName.split(/\s+/)[0];
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-8 h-8 text-emerald-300" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Thank you, {firstName}!</h2>
      <p className="text-[#c8d3e0] max-w-md mx-auto leading-relaxed mb-2">
        We received your partnership request. Our team reviews every request and will get back to you by email.
      </p>
      <p className="text-sm text-[#A0A0A0] mb-8">
        A confirmation is on its way to <span className="text-white">{email}</span>.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm no-underline hover:shadow-[0_10px_30px_rgba(255,215,0,0.35)] transition-all"
        >
          Back to Home
        </Link>
        <Link
          href="/products"
          style={{ color: '#ffffff' }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[rgba(255,255,255,0.15)] text-white font-semibold text-sm no-underline hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}

function NextStepsCard() {
  const steps = [
    { icon: ClipboardCheck, title: 'We review your request', text: 'Our team looks at your company and the partnership you have in mind.' },
    { icon: Mail, title: 'We get in touch', text: 'We reply by email to talk through the details and next steps.' },
    { icon: Rocket, title: 'We start working together', text: 'Once we agree, we set up the partnership and get you started.' },
  ];
  return (
    <aside className="rounded-[20px] p-8 border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,28,32,0.6)] to-[rgba(15,27,43,0.8)]">
      <h2 className="text-2xl font-bold text-white mb-6">What happens next</h2>
      <ol className="space-y-5">
        {steps.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-[#FFD700]" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-[#A0A0A0] text-sm leading-relaxed">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="my-6 h-px bg-[rgba(255,255,255,0.08)]" />
      <p className="text-sm text-[#A0A0A0]">
        Questions first? Email us at{' '}
        <a href="mailto:info@coretradeglobal.com" className="text-[#FFD700] hover:underline break-all">
          info@coretradeglobal.com
        </a>
        .
      </p>
    </aside>
  );
}
