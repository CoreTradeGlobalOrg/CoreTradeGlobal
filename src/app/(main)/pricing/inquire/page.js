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
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, ChevronLeft, Send, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/core/config/firebase.config';
import { AD_PACKAGES as PACKAGES, TYPE_TO_PACKAGE, CAMPAIGN_WEEKS, AD_TYPES } from '@/core/constants/adTypes';
import { useAuth } from '@/presentation/contexts/AuthContext';

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
  const { user } = useAuth();
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

  // Product picker state — only used when the Featured tier is chosen and
  // the visitor is signed in. Stores the raw product docs + which one the
  // user selected. `productsLoading` prevents the "no products" empty
  // state from flashing on first render.
  const [myProducts, setMyProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  const pkgMeta = useMemo(() => PACKAGES.find((p) => p.value === pkg), [pkg]);
  const isFeatured = pkgMeta?.type === AD_TYPES.FEATURED;
  const userTouchedFields = useRef({ company: false, website: false, contactName: false, email: false });

  // Autofill from the signed-in user's profile. We only overwrite fields
  // the visitor hasn't manually edited yet, so hitting an old draft in
  // this session doesn't stomp their input.
  useEffect(() => {
    if (!user) return;
    if (!userTouchedFields.current.company && user.companyName) {
      setCompany(user.companyName);
    }
    if (!userTouchedFields.current.contactName && user.displayName) {
      setContactName(user.displayName);
    }
    if (!userTouchedFields.current.email && user.email) {
      setEmail(user.email);
    }
    // Profile stores the URL as `companyWebsite`; fall back to plain
    // `website` in case an older schema still surfaces it.
    const site = user.companyWebsite || user.website;
    if (!userTouchedFields.current.website && site) {
      setWebsite(site);
    }
  }, [user]);

  // Load the signed-in user's own product catalog when Featured is picked.
  // We do NOT preselect one — the user must actively click a tile so the
  // choice is intentional. Empty catalog is fine; admin will pick manually.
  useEffect(() => {
    if (!user?.uid || !isFeatured) {
      setMyProducts([]);
      setSelectedProductId('');
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    (async () => {
      try {
        // Single equality filter on `userId` — no composite index needed.
        // We filter to active status client-side because most sellers
        // have only a handful of products; keeps the query trivial and
        // avoids depending on an admin-managed composite index.
        const snap = await getDocs(
          query(collection(db, 'products'), where('userId', '==', user.uid))
        );
        if (cancelled) return;
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => (p.status || 'active') === 'active');
        setMyProducts(items);
      } catch (err) {
        if (!cancelled) {
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
  }, [user?.uid, isFeatured]);

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
      const selectedProduct = isFeatured && selectedProductId
        ? myProducts.find((p) => p.id === selectedProductId)
        : null;
      const productSnapshot = selectedProduct
        ? {
            name: String(selectedProduct.name || '').slice(0, 200),
            image: String(selectedProduct.images?.[0] || '').slice(0, 1000),
            price: Number.isFinite(Number(selectedProduct.price)) ? Number(selectedProduct.price) : 0,
            currency: String(selectedProduct.currency || 'USD').slice(0, 10),
            description: String(selectedProduct.description || '').slice(0, 500),
          }
        : null;

      const payload = {
        company: company.trim(),
        website: normalizeUrl(website),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        package: pkg,
        campaignMonth,
        campaignWeek,
        brief: brief.trim(),
        status: 'new',
        // MUST be serverTimestamp() — the Firestore rule enforces
        // `createdAt == request.time` which only matches server-issued
        // timestamps. Client-side `Timestamp.now()` never lines up with
        // `request.time` (network latency) and the write is rejected.
        createdAt: serverTimestamp(),
      };
      if (user?.uid) payload.userId = user.uid;
      if (selectedProduct) {
        payload.productId = selectedProduct.id;
        payload.productSnapshot = productSnapshot;
      }
      await addDoc(collection(db, 'adInquiries'), payload);
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
          href="/advertising"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm mb-6 transition-colors no-underline"
          style={{ color: '#A0A0A0' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Advertising
        </Link>

        <div className="mb-6 text-center">
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

          {/* Contact + Email row */}
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

          {/* Product picker — Featured tier only. Signed-in visitors can
              pin one of their own active products to the placement; that
              product's image + name flow into the ad creative when an
              admin converts the inquiry. Not signed in → prompt to sign
              in. No active products → hint to add one first. */}
          {isFeatured && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Pin One Of Your Products <span className="text-[#A0A0A0] normal-case font-normal">(optional)</span>
              </label>
              {!user ? (
                <div className="rounded-xl border border-dashed border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.04)] px-4 py-3 text-sm text-[#c8d3e0]">
                  <Link href="/login" className="text-[#FFD700] underline">Sign in</Link>{' '}
                  to pick a product from your catalog — otherwise our team will help pick the creative after you submit.
                </div>
              ) : productsLoading ? (
                <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#A0A0A0] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your products…
                </div>
              ) : myProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#c8d3e0]">
                  You don&apos;t have any active products yet. You can still submit and our team will help you choose the creative later — or{' '}
                  <Link href="/product/new" className="text-[#FFD700] underline">add a product</Link> first.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {myProducts.map((p) => {
                    const selected = selectedProductId === p.id;
                    const img = p.images?.[0];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProductId(selected ? '' : p.id)}
                        className={`relative rounded-xl overflow-hidden border text-left transition-all ${
                          selected
                            ? 'border-[#FFD700] shadow-[0_0_0_2px_rgba(255,215,0,0.35)]'
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
              )}
              {selectedProductId && (
                <p className="text-xs text-[#FFD700] mt-2">
                  Selected. This product&apos;s image and title will pre-fill the ad creative on admin approval.
                </p>
              )}
            </div>
          )}

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
