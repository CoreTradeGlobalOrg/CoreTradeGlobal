/**
 * AdCampaignForm
 *
 * Modal-style form for creating or editing an ad campaign. Reused by:
 *   - AdCampaignsManager "Create Ad" / row Edit actions
 *   - AdInquiriesManager "Convert to Ad" (prefill from inquiry)
 *
 * On submit we run an overlap check — for the same ad type, any
 * scheduled or active ad whose date range intersects with the new one
 * blocks the write. Once cleared, we upload the creative (if new) to
 * Storage and either addDoc (create) or updateDoc (edit) into `ads`.
 *
 * Server-time enforcement lives in the Firestore rules for `adInquiries`;
 * `ads` allows admin-only writes so we're free to do a two-step upload
 * (get a doc ref, upload to Storage under that adId, then persist the
 * URL) without worrying about clients bypassing the flow.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import {
  AD_STATUSES,
  AD_TYPES,
  AD_TYPE_LABELS,
  CAMPAIGN_WEEKS,
  campaignWeekToDates,
} from '@/core/constants/adTypes';

const DEFAULT_STATUS_BY_DATE = (startMs, endMs) => {
  const now = Date.now();
  if (now < startMs) return AD_STATUSES.SCHEDULED;
  if (now > endMs) return AD_STATUSES.EXPIRED;
  return AD_STATUSES.ACTIVE;
};

function normalizeUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  // Preserve internal app paths ("/product/xyz") as-is so a Featured ad
  // can deep-link into the pinned product page. Only external URLs get
  // the https:// prefix if the scheme is missing.
  if (trimmed.startsWith('/')) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Pick the first (month, week) whose end date is >= today so the form
// defaults to something that will actually go live. Otherwise the admin
// hits Save on the leftover "Week 1" default and ends up with an ad
// that's created in EXPIRED status and never shows on the homepage.
function pickDefaultMonthWeek(months) {
  const now = Date.now();
  for (const m of months) {
    for (const w of CAMPAIGN_WEEKS) {
      const range = campaignWeekToDates(m, w);
      if (range && range.endDate.getTime() >= now) {
        return { month: m, week: w };
      }
    }
  }
  return { month: months[1] || months[0], week: CAMPAIGN_WEEKS[0] };
}

function computeMonths() {
  const months = [];
  const now = new Date();
  const fmt = (d) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  for (let i = -1; i < 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(fmt(d));
  }
  return months;
}

export function AdCampaignForm({
  editing,       // ad doc if editing, else null
  prefill,       // { type, companyName, linkUrl, companyLogo, description, badgeText, productId, inquiryId, campaignMonth, campaignWeek }
  onClose,
  onSaved,
}) {
  const { user } = useAuth();
  const months = useMemo(() => computeMonths(), []);
  const isEdit = !!editing?.id;

  const [type, setType] = useState(editing?.type || prefill?.type || AD_TYPES.FEATURED);
  const [companyName, setCompanyName] = useState(editing?.companyName || prefill?.companyName || '');
  const [description, setDescription] = useState(editing?.description || prefill?.description || '');
  const [linkUrl, setLinkUrl] = useState(editing?.linkUrl || prefill?.linkUrl || '');
  const defaults = useMemo(() => pickDefaultMonthWeek(months), [months]);
  const [campaignMonth, setCampaignMonth] = useState(
    editing?.campaignMonth || prefill?.campaignMonth || defaults.month
  );
  const [campaignWeek, setCampaignWeek] = useState(
    editing?.campaignWeek || prefill?.campaignWeek || defaults.week
  );
  const [priority, setPriority] = useState(editing?.priority ?? 0);
  const [badgeText, setBadgeText] = useState(editing?.badgeText || prefill?.badgeText || '');
  const [logoFile, setLogoFile] = useState(null);
  // Existing logo can arrive from either an edit or an inquiry prefill
  // (pinned product image). If the admin doesn't upload a new file, we
  // carry the prefill URL through to the ad doc unchanged.
  const [prefillLogoUrl] = useState(prefill?.companyLogo || null);
  const [logoPreview, setLogoPreview] = useState(editing?.companyLogo || prefill?.companyLogo || null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const validate = () => {
    const e = {};
    if (!companyName.trim()) e.companyName = 'Company name is required.';
    if (!description.trim()) e.description = 'Short description is required.';
    if (description.length > 240) e.description = 'Description must be under 240 characters.';
    if (!linkUrl.trim()) e.linkUrl = 'Link URL is required.';
    if (!type) e.type = 'Type is required.';
    if (!campaignMonth) e.campaignMonth = 'Pick a campaign month.';
    if (!campaignWeek) e.campaignWeek = 'Pick a campaign week.';
    if (!isEdit && !logoFile && !logoPreview) e.logo = 'Upload a logo/creative.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    const dates = campaignWeekToDates(campaignMonth, campaignWeek);
    if (!dates) {
      toast.error('Invalid campaign month/week combination.');
      return;
    }

    setSubmitting(true);
    try {
      // Overlap check — ensure no other active/scheduled ad of the same
      // type covers any part of this new week.
      const conflictQuery = query(
        collection(db, 'ads'),
        where('type', '==', type),
        where('status', 'in', [AD_STATUSES.SCHEDULED, AD_STATUSES.ACTIVE, AD_STATUSES.PAUSED])
      );
      const conflictSnap = await getDocs(conflictQuery);
      const newStart = dates.startDate.getTime();
      const newEnd = dates.endDate.getTime();
      const overlap = conflictSnap.docs.find((d) => {
        if (isEdit && d.id === editing.id) return false;
        const data = d.data();
        if (!data.startDate?.toDate || !data.endDate?.toDate) return false;
        const otherStart = data.startDate.toDate().getTime();
        const otherEnd = data.endDate.toDate().getTime();
        return otherStart <= newEnd && otherEnd >= newStart;
      });
      if (overlap) {
        const c = overlap.data();
        toast.error(
          `This week is already booked by "${c.companyName}" (${c.campaignMonth} · ${c.campaignWeek}).`,
          { duration: 6000 }
        );
        setSubmitting(false);
        return;
      }

      // Reserve the ad id (create with placeholder then upload + patch)
      // so the logo lands under the final ad's path.
      const now = Timestamp.now();
      const startTs = Timestamp.fromDate(dates.startDate);
      const endTs = Timestamp.fromDate(dates.endDate);
      const computedStatus = DEFAULT_STATUS_BY_DATE(newStart, newEnd);

      const baseFields = {
        type,
        companyName: companyName.trim(),
        description: description.trim(),
        linkUrl: normalizeUrl(linkUrl),
        campaignMonth,
        campaignWeek,
        startDate: startTs,
        endDate: endTs,
        priority: Number.isFinite(priority) ? priority : 0,
        badgeText: badgeText.trim() || null,
        inquiryId: editing?.inquiryId ?? prefill?.inquiryId ?? null,
        productId: editing?.productId ?? prefill?.productId ?? null,
        updatedAt: serverTimestamp(),
      };

      // When the admin didn't upload a new file, seed the initial doc
      // with any prefill logo URL (e.g. the pinned product image) so the
      // ad is displayable immediately without a second write.
      const initialLogo = prefillLogoUrl || null;

      let adId = editing?.id;
      if (isEdit) {
        await updateDoc(doc(db, 'ads', adId), {
          ...baseFields,
          status: editing.status === AD_STATUSES.PAUSED ? AD_STATUSES.PAUSED : computedStatus,
        });
      } else {
        const created = await addDoc(collection(db, 'ads'), {
          ...baseFields,
          status: computedStatus,
          companyLogo: initialLogo,
          impressions: 0,
          clicks: 0,
          createdAt: now,
          createdBy: user?.uid || null,
        });
        adId = created.id;
      }

      // Upload the new logo if provided and patch the URL back on.
      if (logoFile && adId) {
        const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase();
        const storageDS = container.getFirebaseStorageDataSource();
        const path = `ads/${adId}/creative.${ext}`;
        const url = await storageDS.uploadFile(path, logoFile);
        await updateDoc(doc(db, 'ads', adId), { companyLogo: url });
      }

      toast.success(isEdit ? 'Ad updated' : 'Ad created');
      onSaved?.(adId);
      onClose?.();
    } catch (err) {
      console.error('AdCampaignForm submit failed:', err);
      toast.error(err?.message || 'Save failed. Please try again.');
      setSubmitting(false);
    }
  };

  const inputClass = (fieldError) =>
    `w-full bg-[rgba(255,255,255,0.05)] border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors ${
      fieldError ? 'border-red-400/60' : 'border-[rgba(255,255,255,0.1)]'
    }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0F1B2B] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)] bg-[#0F1B2B]">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Ad Campaign' : 'Create Ad Campaign'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A0A0A0] hover:text-white p-1 rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Ad Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(AD_TYPES).map((t) => {
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                        : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.5)]'
                    }`}
                  >
                    {AD_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Company Name + Link URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={200}
                className={inputClass(errors.companyName)}
              />
              {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName}</p>}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Link URL <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="www.company.com or /profile/{id}"
                maxLength={500}
                className={inputClass(errors.linkUrl)}
              />
              {errors.linkUrl && <p className="text-xs text-red-400 mt-1">{errors.linkUrl}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={240}
              placeholder="Short tagline shown next to the logo in the ad slot."
              className={inputClass(errors.description) + ' resize-y'}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              <p className="text-xs text-[#A0A0A0] ml-auto">{description.length}/240</p>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Company Logo / Creative {!isEdit && <span className="text-red-400">*</span>}
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-xl border border-[rgba(255,255,255,0.1)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[rgba(255,215,0,0.4)] bg-[rgba(255,215,0,0.05)] flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#FFD700]" />
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.1)]">
                <Upload className="w-4 h-4" />
                {logoPreview ? 'Replace' : 'Choose file'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
              {logoFile && (
                <span className="text-xs text-[#A0A0A0]">{logoFile.name}</span>
              )}
            </div>
            {errors.logo && <p className="text-xs text-red-400 mt-1">{errors.logo}</p>}
          </div>

          {/* Campaign Month */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Campaign Month <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {months.map((m) => {
                const selected = campaignMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCampaignMonth(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
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
          </div>

          {/* Campaign Week */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
              Campaign Week <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAMPAIGN_WEEKS.map((w) => {
                const selected = campaignWeek === w;
                const range = campaignWeekToDates(campaignMonth, w);
                const nowMs = Date.now();
                const isPast = range && range.endDate.getTime() < nowMs;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setCampaignWeek(w)}
                    disabled={isPast}
                    title={isPast ? 'This week has already ended' : undefined}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-[rgba(255,215,0,0.15)] border-[#FFD700] text-[#FFD700]'
                        : isPast
                          ? 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[#5a6473] cursor-not-allowed'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,215,0,0.5)]'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            {/* Live "this ad will be…" hint so the admin doesn't create
                an EXPIRED ad by accident on the leftover default week. */}
            <ScheduleHint month={campaignMonth} week={campaignWeek} />
          </div>

          {/* Priority + Badge text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Priority (higher wins ties)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                min={-99}
                max={99}
                className={inputClass(false)}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Badge text (optional)
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                maxLength={30}
                placeholder="Sponsored"
                className={inputClass(false)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ color: submitting ? undefined : '#0F1B2B', WebkitTextFillColor: submitting ? undefined : '#0F1B2B' }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] font-bold text-sm hover:shadow-[0_10px_25px_rgba(255,215,0,0.35)] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Ad'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleHint({ month, week }) {
  const range = campaignWeekToDates(month, week);
  if (!range) return null;
  const now = Date.now();
  const startMs = range.startDate.getTime();
  const endMs = range.endDate.getTime();
  const status = DEFAULT_STATUS_BY_DATE(startMs, endMs);
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const meta = {
    [AD_STATUSES.ACTIVE]: {
      label: 'Will go live immediately',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40',
      text: 'text-emerald-300',
    },
    [AD_STATUSES.SCHEDULED]: {
      label: `Will go live on ${fmt(range.startDate)}`,
      bg: 'bg-[#FFD700]/12',
      border: 'border-[#FFD700]/40',
      text: 'text-[#FFD700]',
    },
    [AD_STATUSES.EXPIRED]: {
      label: 'This window has already ended — pick a later week',
      bg: 'bg-red-500/15',
      border: 'border-red-500/40',
      text: 'text-red-300',
    },
  }[status];
  if (!meta) return null;

  return (
    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
      <span className="uppercase tracking-wider">{status}</span>
      <span className="text-white/80 font-normal">— {meta.label} · {fmt(range.startDate)} → {fmt(range.endDate)}</span>
    </div>
  );
}

export default AdCampaignForm;
