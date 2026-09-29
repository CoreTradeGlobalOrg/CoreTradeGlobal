/**
 * Sponsored Package Inquiry Form
 *
 * URL: /pricing/inquire[?type=sponsored]
 *
 * Post-consolidation the platform sells exactly one placement — the
 * Sponsored Package — at $499/month. Buyers pick a calendar month
 * (must be a future month, cannot collide with an already-booked one)
 * and, if signed in, pick the products that fill each surface (hero
 * left, showcase mini-cards, /products slot).
 *
 * The month picker fetches sponsored ads from Firestore and excludes
 * months whose start/end range intersects an active/scheduled/paused
 * campaign. Personal info auto-fills from the signed-in user's profile
 * but stays editable. Submit writes to `adInquiries/{autoId}`; the
 * `notifyAdminsOnAdInquiry` Cloud Function fans out notifications.
 *
 * On success we route to /pricing/inquire/thank-you.
 */

'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, Send, Loader2, Check, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import {
  AD_PACKAGES as PACKAGES,
  AD_TYPES,
  AD_STATUSES,
  monthRange,
  upcomingMonths,
} from '@/core/constants/adTypes';
import {
  PAYMENT_STATUSES,
  PAYMENT_RESERVATION_DAYS,
  RESERVING_PAYMENT_STATUSES,
  generatePaymentReference,
} from '@/core/constants/wireTransfer';
import { useAuth } from '@/presentation/contexts/AuthContext';

const RATE_LIMIT_KEY = 'ad_inquiry_last_submit_at';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SPONSORED_PACKAGE = PACKAGES.find((p) => p.type === AD_TYPES.SPONSORED) || PACKAGES[0];

function normalizeUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Anchor the month list at the FIRST DAY OF THE MONTH AFTER TODAY. Users
// can never book the current month — the rule is "next month or later,
// as long as it isn't already claimed."
function nextMonthAnchor() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function keyFor(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// Given an ad doc's startDate/endDate, return every month-key the range
// spans so a September→October ad blocks both months.
function monthKeysCoveredBy(startTs, endTs) {
  const start = startTs?.toDate ? startTs.toDate() : new Date(startTs);
  const end = endTs?.toDate ? endTs.toDate() : new Date(endTs);
  if (Number.isNaN(start?.getTime?.()) || Number.isNaN(end?.getTime?.())) return [];
  const out = new Set();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const stop = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= stop.getTime()) {
    out.add(keyFor(cursor.getFullYear(), cursor.getMonth()));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return [...out];
}

function InquirePageInner() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Login-required — the inquiry ties to a userId that admins reference
  // when confirming payment, and /my-sponsorships needs an owner to
  // list against. Wait for auth to resolve, then push anonymous users
  // to /login with a returnTo so they land back here after signing in.
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) router.replace('/login?returnTo=/pricing/inquire?type=sponsored');
  }, [authLoading, user, router]);

  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const firstErrorRef = useRef(null);
  const userTouchedFields = useRef({ company: false, website: false, contactName: false, email: false });

  // Product picker — sponsored slots.
  const [myProducts, setMyProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [heroProductId, setHeroProductId] = useState('');
  const [showcaseProductIds, setShowcaseProductIds] = useState([]);
  const [productsListProductId, setProductsListProductId] = useState('');

  // Month picker — the campaign window is exactly one calendar month.
  const [bookedKeys, setBookedKeys] = useState(new Set());
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');

  const anchor = useMemo(nextMonthAnchor, []);
  const candidateMonths = useMemo(() => upcomingMonths(anchor, 12), [anchor]);
  const availableMonths = useMemo(
    () => candidateMonths.filter((m) => !bookedKeys.has(m.key)),
    [candidateMonths, bookedKeys],
  );

  // Fetch already-taken sponsored months. A month is unavailable when
  // it's covered by an active/scheduled/paused ad OR by a pending
  // inquiry that still holds a reservation (awaiting_payment / reported
  // / paid). The two queries run in parallel; the union of their month
  // keys is what disables the dropdown entries.
  useEffect(() => {
    let cancelled = false;
    setMonthsLoading(true);
    (async () => {
      try {
        const [adSnap, inqSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'ads'),
              where('type', '==', AD_TYPES.SPONSORED),
              where('status', 'in', [AD_STATUSES.SCHEDULED, AD_STATUSES.ACTIVE, AD_STATUSES.PAUSED]),
            ),
          ),
          getDocs(
            query(
              collection(db, 'adInquiries'),
              where('paymentStatus', 'in', RESERVING_PAYMENT_STATUSES),
            ),
          ).catch(() => ({ forEach: () => {} })),
        ]);
        if (cancelled) return;
        const keys = new Set();
        adSnap.forEach((doc) => {
          const data = doc.data();
          monthKeysCoveredBy(data.startDate, data.endDate).forEach((k) => keys.add(k));
        });
        inqSnap.forEach((doc) => {
          const data = doc.data();
          monthKeysCoveredBy(data.startDate, data.endDate).forEach((k) => keys.add(k));
        });
        setBookedKeys(keys);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[inquire] booked-month lookup failed:', err);
      } finally {
        if (!cancelled) setMonthsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select the earliest available month once the fetch resolves.
  useEffect(() => {
    if (monthsLoading) return;
    if (selectedMonthKey && availableMonths.some((m) => m.key === selectedMonthKey)) return;
    setSelectedMonthKey(availableMonths[0]?.key || '');
  }, [monthsLoading, availableMonths, selectedMonthKey]);

  // Autofill from the signed-in user's profile.
  useEffect(() => {
    if (!user) return;
    if (!userTouchedFields.current.company && user.companyName) setCompany(user.companyName);
    if (!userTouchedFields.current.contactName && user.displayName) setContactName(user.displayName);
    if (!userTouchedFields.current.email && user.email) setEmail(user.email);
    const site = user.companyWebsite || user.website;
    if (!userTouchedFields.current.website && site) setWebsite(site);
  }, [user]);

  // Load the signed-in user's own product catalog for the sponsored pickers.
  useEffect(() => {
    if (!user?.uid) {
      setMyProducts([]);
      setHeroProductId('');
      setShowcaseProductIds([]);
      setProductsListProductId('');
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), where('userId', '==', user.uid)),
        );
        if (cancelled) return;
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => (p.status || 'active') === 'active');
        setMyProducts(items);
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('inquire: product fetch failed:', err);
          setMyProducts([]);
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const selectedMonth = availableMonths.find((m) => m.key === selectedMonthKey);
  const campaignRange = useMemo(
    () => (selectedMonth ? monthRange(selectedMonth.year, selectedMonth.monthIndex) : null),
    [selectedMonth],
  );

  const validate = () => {
    const e = {};
    if (!company.trim()) e.company = 'Company name is required.';
    if (!contactName.trim()) e.contactName = 'Contact name is required.';
    if (!email.trim() || !EMAIL_RE.test(email.trim())) e.email = 'A valid business email is required.';
    if (!website.trim()) e.website = 'Company website is required.';
    if (!selectedMonthKey || !campaignRange) e.month = 'Pick an available month.';
    if (user?.uid && myProducts.length > 0) {
      if (!heroProductId) e.heroProduct = 'Pick one product for the hero card.';
      if (!productsListProductId) e.listProduct = 'Pick one product for the /products directory slot.';
    }
    if (brief.length > 2000) e.brief = 'Brief must be under 2000 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) return;

    try {
      const raw = window.localStorage.getItem(RATE_LIMIT_KEY);
      if (raw) {
        const last = Number(raw);
        if (Number.isFinite(last) && Date.now() - last < RATE_LIMIT_WINDOW_MS) {
          toast.error('You just submitted an inquiry. Please wait a minute before trying again.');
          return;
        }
      }
    } catch {
      // localStorage disabled — server-side rules still enforce shape.
    }

    if (!validate()) {
      firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      // Reservation holds the picked month for PAYMENT_RESERVATION_DAYS
      // days from submit. After that a paymentReminderSweep CF flips
      // the inquiry to `expired` and the month returns to the pool.
      const reservedUntil = new Date();
      reservedUntil.setDate(reservedUntil.getDate() + PAYMENT_RESERVATION_DAYS);

      const payload = {
        company: company.trim(),
        website: normalizeUrl(website),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        package: SPONSORED_PACKAGE.value,
        duration: 'monthly',
        startDate: Timestamp.fromDate(campaignRange.start),
        endDate: Timestamp.fromDate(campaignRange.end),
        brief: brief.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
        userId: user.uid,
        paymentStatus: PAYMENT_STATUSES.AWAITING,
        paymentReference: generatePaymentReference(),
        monthReservedUntil: Timestamp.fromDate(reservedUntil),
      };

      // Sponsored slots — persist the three picks so the admin sees the
      // buyer's choices when converting the inquiry into an ad.
      if (heroProductId) payload.heroProductId = heroProductId;
      if (productsListProductId) payload.productsListProductId = productsListProductId;
      const effectiveShowcase =
        showcaseProductIds.length > 0
          ? showcaseProductIds.filter(Boolean).slice(0, 3)
          : Array.from(new Set([heroProductId, productsListProductId].filter(Boolean))).slice(0, 3);
      if (effectiveShowcase.length > 0) payload.showcaseProductIds = effectiveShowcase;

      const docRef = await addDoc(collection(db, 'adInquiries'), payload);
      try {
        window.localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
      } catch {
        // ignore quota / privacy-mode errors
      }
      // Route straight to the wire-transfer instructions. Buyer can
      // finish payment now or come back later via /my-sponsorships.
      router.push(`/pricing/inquire/pay/${docRef.id}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('adInquiry create failed:', err);
      toast.error('Something went wrong sending the inquiry. Please try again.');
      setSubmitting(false);
    }
  };

  // Auth-loading / anonymous — show a lightweight spinner while the
  // redirect effect fires so the form doesn't paint for a split second.
  if (authLoading || !user?.uid) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#A0A0A0] text-sm">Checking session…</p>
        </div>
      </main>
    );
  }

  const fieldClasses = (fieldError) =>
    `w-full bg-[rgba(255,255,255,0.05)] border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors ${
      fieldError ? 'border-red-400/60' : 'border-[rgba(255,255,255,0.1)]'
    }`;

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-3xl mx-auto px-5">
        <Link
          href="/advertising"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 transition-colors no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Advertising
        </Link>

        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Book the Sponsored Package</h1>
          <p className="text-[#c8d3e0] text-base max-w-xl mx-auto">
            One purchase, four surfaces — hero cards, showcase, and the products directory. Sold as a full calendar month.
          </p>
        </div>

        <PriceBanner />

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[rgba(26,40,59,0.85)] to-[rgba(15,27,43,0.95)] p-6 md:p-8 space-y-6"
        >
          {/* Company + Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={errors.company ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => { userTouchedFields.current.company = true; setCompany(e.target.value); }}
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
                onChange={(e) => { userTouchedFields.current.website = true; setWebsite(e.target.value); }}
                placeholder="www.mycompany.com"
                maxLength={500}
                className={fieldClasses(errors.website)}
              />
              {errors.website && <p className="text-xs text-red-400 mt-1">{errors.website}</p>}
            </div>
          </div>

          {/* Contact + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={!errors.company && !errors.website && errors.contactName ? firstErrorRef : null}>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Contact Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => { userTouchedFields.current.contactName = true; setContactName(e.target.value); }}
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
                onChange={(e) => { userTouchedFields.current.email = true; setEmail(e.target.value); }}
                placeholder="marketing@mycompany.com"
                maxLength={254}
                className={fieldClasses(errors.email)}
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Month picker */}
          <div ref={!errors.email && !errors.contactName && !errors.website && !errors.company && errors.month ? firstErrorRef : null}>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Campaign Month <span className="text-red-400">*</span>
            </label>
            {monthsLoading ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#A0A0A0] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading available months…
              </div>
            ) : availableMonths.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.04)] px-4 py-3 text-sm text-[#c8d3e0]">
                All upcoming months are booked. Contact us and we&apos;ll add you to the waitlist.
              </div>
            ) : (
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#FFD700] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className={`${fieldClasses(errors.month)} pl-11 appearance-none cursor-pointer`}
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key} className="bg-[#0F1B2B]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {campaignRange && (
              <p className="text-xs text-[#FFD700] mt-2">
                Campaign runs {campaignRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' → '}
                {campaignRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
              </p>
            )}
            {bookedKeys.size > 0 && !monthsLoading && (
              <p className="text-xs text-[#A0A0A0] mt-1">
                Some months are hidden because they&apos;re already booked by another advertiser.
              </p>
            )}
            {errors.month && <p className="text-xs text-red-400 mt-1">{errors.month}</p>}
          </div>

          {/* Sponsored slot pickers */}
          {user && !productsLoading && myProducts.length > 0 && (
            <>
              <SponsoredPickerBlock
                title="Hero Product (required)"
                helper="Shown as the top-left sponsored card in the hero."
                mode="single"
                products={myProducts}
                selectedIds={heroProductId ? [heroProductId] : []}
                onToggle={(id) => setHeroProductId((prev) => (prev === id ? '' : id))}
                error={errors.heroProduct}
              />
              <SponsoredPickerBlock
                title="Showcase Products (optional — up to 3)"
                helper="Featured mini-cards inside the sponsored company section. Blank falls back to your hero + list picks."
                mode="multi"
                max={3}
                products={myProducts}
                selectedIds={showcaseProductIds}
                onToggle={(id) => setShowcaseProductIds((prev) => {
                  if (prev.includes(id)) return prev.filter((x) => x !== id);
                  if (prev.length >= 3) return prev;
                  return [...prev, id];
                })}
              />
              <SponsoredPickerBlock
                title="/products Directory Product (required)"
                helper="Shown as the top sponsored tile on the /products page."
                mode="single"
                products={myProducts}
                selectedIds={productsListProductId ? [productsListProductId] : []}
                onToggle={(id) => setProductsListProductId((prev) => (prev === id ? '' : id))}
                error={errors.listProduct}
              />
            </>
          )}
          {!user && (
            <div className="rounded-xl border border-dashed border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.04)] px-4 py-3 text-sm text-[#c8d3e0]">
              <Link href="/login" className="text-[#FFD700] underline">Sign in</Link>{' '}
              to pick products from your catalog. Otherwise our team will help pick the creatives after you submit.
            </div>
          )}
          {user && productsLoading && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#A0A0A0] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your products…
            </div>
          )}
          {user && !productsLoading && myProducts.length === 0 && (
            <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#c8d3e0]">
              You don&apos;t have any active products yet.{' '}
              <Link href="/product/new" className="text-[#FFD700] underline">Add a product</Link> first — the sponsored package showcases your catalog.
            </div>
          )}

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
              disabled={submitting || availableMonths.length === 0}
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

function SponsoredPickerBlock({ title, helper, mode, max, products, selectedIds, onToggle, error }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
        {title}
      </label>
      {helper && <p className="text-xs text-[#A0A0A0] mb-2">{helper}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {products.map((p) => {
          const selected = selectedIds.includes(p.id);
          const capped = mode === 'multi' && !selected && selectedIds.length >= max;
          const img = p.images?.[0];
          return (
            <button
              key={p.id}
              type="button"
              disabled={capped}
              onClick={() => onToggle(p.id)}
              className={`relative rounded-xl overflow-hidden border text-left transition-all ${
                selected
                  ? 'border-[#FFD700] shadow-[0_0_0_2px_rgba(255,215,0,0.35)]'
                  : capped
                    ? 'border-[rgba(255,255,255,0.06)] opacity-40 cursor-not-allowed'
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,215,0,0.5)]'
              }`}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="aspect-square bg-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="text-[#A0A0A0] text-xs">No image</span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-white font-semibold truncate">{p.name || 'Untitled'}</p>
                {Number.isFinite(Number(p.price)) && p.price > 0 && (
                  <p className="text-[10px] text-[#FFD700] mt-0.5">
                    {p.currency || 'USD'} {Number(p.price).toLocaleString()}
                  </p>
                )}
              </div>
              {selected && (
                <span
                  className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full"
                  style={{ background: '#FFD700', color: '#0F1B2B' }}
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// Static banner — one package, one price, no toggles.
function PriceBanner() {
  return (
    <div
      translate="no"
      className="mb-6 rounded-2xl border border-[rgba(255,215,0,0.3)] bg-gradient-to-br from-[rgba(255,215,0,0.08)] to-[rgba(253,185,49,0.03)] px-5 py-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#FFD700] font-semibold mb-1">Selected placement</p>
          <p className="text-white font-bold text-base">{SPONSORED_PACKAGE.value}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">
            ${SPONSORED_PACKAGE.monthly}
          </span>
          <span className="text-[#A0A0A0] text-sm font-semibold">/month</span>
        </div>
      </div>
      <p className="text-xs text-[#c8d3e0] mt-3">
        Full-site sponsored placement — hero + showcase + /products directory — sold as a full calendar month.
      </p>
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
