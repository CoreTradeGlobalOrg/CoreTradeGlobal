'use client';

/**
 * SendPanel
 *
 * Pick a saved template and a sender, add recipients (selected members and/or
 * a CSV), review what the server will actually do (createEmailCampaign with
 * dryRun), then confirm. Sends above CONFIRM_TYPING_THRESHOLD recipients need
 * the admin to type SEND.
 */

import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Send, ShieldCheck, Upload, X } from 'lucide-react';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';
import { MAX_CSV_ROWS, parseRecipientsCsv } from '@/lib/email/adminEmailCsv';
import { BUILT_IN_VARIABLES, UNSUBSCRIBE_VARIABLE, findVariables } from '@/lib/email/adminEmailTemplate';
import { MemberPicker } from './MemberPicker';

const CONFIRM_TYPING_THRESHOLD = 100;

const EXCLUSION_LABELS = {
  unsubscribed: 'Unsubscribed',
  bounced: 'Bounced or marked as spam before',
  admin: 'Admin accounts',
  banned: 'Banned accounts',
  deleted: 'Deleted accounts',
  suspended: 'Suspended accounts',
};

const inputClass =
  'w-full bg-[#1a2a3a] border border-[rgba(255,255,255,0.15)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50 disabled:opacity-50';
const labelClass = 'block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5';
const cardClass = 'rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-4';

function Row({ label, value, tone = 'text-white' }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#A0A0A0]">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export function SendPanel({ templates, senders, users, onSent }) {
  const [templateId, setTemplateId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [name, setName] = useState('');
  const [selectedUids, setSelectedUids] = useState(() => new Set());
  const [csv, setCsv] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  const activeSenders = senders.filter((s) => s.active !== false);
  const effectiveSenderId = activeSenders.some((s) => s.id === senderId) ? senderId : activeSenders[0]?.id || '';
  const sender = activeSenders.find((s) => s.id === effectiveSenderId);
  const template = templates.find((t) => t.id === templateId);

  const recipientCount = selectedUids.size + (csv?.rows.length || 0);

  // Template variables a CSV would have to supply (members only fill the built-ins).
  const customVariables = template
    ? findVariables(template.subject, template.html).filter(
        (v) => !BUILT_IN_VARIABLES.includes(v) && v !== UNSUBSCRIBE_VARIABLE
      )
    : [];
  const csvVariables = new Set(csv?.columns.map((c) => c.variable) || []);
  const missingFromCsv = csv ? customVariables.filter((v) => !csvVariables.has(v)) : [];

  // Any change makes the last review stale.
  function change(setter) {
    return (value) => {
      setter(value);
      setReview(null);
    };
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await parseRecipientsCsv(file);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCsv({ fileName: file.name, ...result });
    setReview(null);
  }

  function payload(dryRun) {
    return {
      templateId,
      senderId: effectiveSenderId,
      uids: [...selectedUids],
      csvRows: csv?.rows || [],
      csvFileName: csv?.fileName || null,
      name: name.trim() || null,
      dryRun,
    };
  }

  async function handleReview() {
    if (!templateId) {
      toast.error('Choose a template.');
      return;
    }
    if (!effectiveSenderId) {
      toast.error('Add an active sender in the Senders tab first.');
      return;
    }
    if (recipientCount === 0) {
      toast.error('Select members or upload a CSV.');
      return;
    }
    setReviewing(true);
    try {
      const createEmailCampaign = httpsCallable(getFunctionsInstance(), 'createEmailCampaign');
      const { data } = await createEmailCampaign(payload(true));
      setReview(data.summary);
    } catch (err) {
      console.error('SendPanel: review error:', err);
      toast.error(err?.message || 'Could not check the recipients.');
    } finally {
      setReviewing(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const createEmailCampaign = httpsCallable(getFunctionsInstance(), 'createEmailCampaign');
      const { data } = await createEmailCampaign(payload(false));
      toast.success(`Sending to ${data.summary.toSend} recipients.`);
      setConfirmOpen(false);
      setSelectedUids(new Set());
      setCsv(null);
      setReview(null);
      setName('');
      onSent?.(data.campaignId);
    } catch (err) {
      console.error('SendPanel: send error:', err);
      toast.error(err?.message || 'Could not start the send.');
    } finally {
      setSending(false);
    }
  }

  const needsTyping = (review?.toSend || 0) > CONFIRM_TYPING_THRESHOLD;
  const overCap = review && review.toSend > review.remainingToday;
  const excludedTotal = review ? Object.values(review.excluded).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Template and sender */}
      <div className={cardClass}>
        <p className="text-sm font-semibold text-white">1. Email</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Template</label>
            <select value={templateId} onChange={(e) => change(setTemplateId)(e.target.value)} className={inputClass}>
              <option value="">Choose a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name || 'Untitled template'}</option>
              ))}
            </select>
            {template && <p className="mt-1.5 text-xs text-[#A0A0A0] truncate">Subject: {template.subject || '(empty)'}</p>}
          </div>
          <div>
            <label className={labelClass}>From</label>
            <select
              value={effectiveSenderId}
              onChange={(e) => change(setSenderId)(e.target.value)}
              disabled={activeSenders.length === 0}
              className={inputClass}
            >
              {activeSenders.length === 0 && <option value="">No active senders</option>}
              {activeSenders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName ? `${s.displayName} <${s.address}>` : s.address}
                </option>
              ))}
            </select>
            {sender && !sender.verifiedAt && (
              <p className="mt-1.5 text-xs text-yellow-400">This sender has not passed a test send yet.</p>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass}>Name for the history (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder={template?.name || 'e.g. November re-engagement'}
            className={inputClass}
          />
        </div>
      </div>

      {/* Recipients */}
      <div className={cardClass}>
        <p className="text-sm font-semibold text-white">2. Recipients</p>

        <div className="space-y-2">
          <p className={labelClass}>Members</p>
          <MemberPicker users={users} selected={selectedUids} onChange={change(setSelectedUids)} />
        </div>

        <div className="space-y-2 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <p className={labelClass}>CSV file</p>
          {csv ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                <span className="text-sm text-white truncate flex-1">{csv.fileName}</span>
                <button
                  type="button"
                  onClick={() => change(setCsv)(null)}
                  aria-label="Remove CSV"
                  className="p-1 rounded text-[#A0A0A0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#A0A0A0]">
                {csv.rows.length} addresses
                {csv.invalid.length > 0 && <span className="text-red-400"> · {csv.invalid.length} invalid (skipped)</span>}
                {csv.duplicate > 0 && <span> · {csv.duplicate} duplicates (sent once)</span>}
              </p>
              {csv.invalid.length > 0 && (
                <p className="text-xs text-[#5a6a7a] break-all">
                  Invalid: {csv.invalid.slice(0, 5).join(', ')}
                  {csv.invalid.length > 5 && ` and ${csv.invalid.length - 5} more`}
                </p>
              )}
              {csv.columns.length > 0 && (
                <p className="text-xs text-[#A0A0A0]">
                  Variables:{' '}
                  {csv.columns.map((c) => (
                    <span key={c.variable} className="font-mono text-[#FFD700] mr-2" title={`Column "${c.header}"`}>
                      {`{{${c.variable}}}`}
                    </span>
                  ))}
                </p>
              )}
              {missingFromCsv.length > 0 && (
                <p className="text-xs text-yellow-400">
                  The template uses {missingFromCsv.map((v) => `{{${v}}}`).join(', ')}, which this CSV has no column for. It
                  will be empty.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-[rgba(255,255,255,0.15)] p-4 text-sm text-[#A0A0A0] hover:text-white hover:border-[#FFD700]/40 inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload a CSV with an &quot;email&quot; column
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <p className="text-xs text-[#5a6a7a]">
            Other columns become variables: &quot;First Name&quot; fills {'{{firstName}}'}, &quot;Job Title&quot; becomes{' '}
            {'{{Job_Title}}'}. Up to {MAX_CSV_ROWS.toLocaleString('en-US')} rows. Only upload people who agreed to hear
            from us.
          </p>
        </div>
      </div>

      {/* Review */}
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">3. Review and send</p>
          <button
            type="button"
            onClick={handleReview}
            disabled={reviewing || recipientCount === 0 || !templateId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {reviewing ? 'Checking...' : review ? 'Check again' : `Check ${recipientCount} recipients`}
          </button>
        </div>

        {review ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] p-4 space-y-2">
              <Row label="Will receive the email" value={review.toSend} tone="text-[#FFD700] text-base" />
              {Object.entries(review.excluded).map(([reason, count]) => (
                <Row key={reason} label={`Skipped: ${EXCLUSION_LABELS[reason] || reason}`} value={count} tone="text-[#A0A0A0]" />
              ))}
              {review.invalid > 0 && <Row label="Skipped: invalid address" value={review.invalid} tone="text-[#A0A0A0]" />}
              {review.duplicate > 0 && <Row label="Listed twice (sent once)" value={review.duplicate} tone="text-[#A0A0A0]" />}
              {review.memberNotFound > 0 && (
                <Row label="Selected accounts that no longer exist" value={review.memberNotFound} tone="text-[#A0A0A0]" />
              )}
              {review.csvMatchedMembers > 0 && (
                <Row label="CSV addresses that belong to accounts" value={review.csvMatchedMembers} tone="text-[#A0A0A0]" />
              )}
              <Row
                label="Left in today's limit"
                value={`${review.remainingToday} of ${review.dailyCap}`}
                tone={overCap ? 'text-red-400' : 'text-[#A0A0A0]'}
              />
            </div>

            {Object.keys(review.emptyVariables).length > 0 && (
              <ul className="space-y-1 text-xs text-yellow-400">
                {Object.entries(review.emptyVariables).map(([variable, count]) => (
                  <li key={variable}>
                    <span className="font-mono">{`{{${variable}}}`}</span> will be empty for {count} recipient
                    {count === 1 ? '' : 's'}.
                  </li>
                ))}
              </ul>
            )}
            {excludedTotal > 0 && (
              <p className="text-xs text-[#5a6a7a]">Skipped addresses are listed under the send in History.</p>
            )}
            {overCap && (
              <p className="text-xs text-red-400">
                This is more than is left of today&apos;s limit. Send to fewer people or wait until tomorrow.
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setConfirmOpen(true);
              }}
              disabled={review.toSend === 0 || overCap}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send to {review.toSend} recipient{review.toSend === 1 ? '' : 's'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#5a6a7a]">
            Checking shows who will get the email and who is skipped (unsubscribed, bounced, banned) before anything is sent.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        onConfirm={() => {
          if (needsTyping && confirmText.trim() !== 'SEND') {
            toast.error('Type SEND to confirm.');
            return;
          }
          return handleSend();
        }}
        title={`Send to ${review?.toSend || 0} recipients?`}
        message={`"${template?.name || 'Template'}" from ${sender?.address || ''}. Emails go out in batches of 50, about two per second. You can pause or cancel from History.`}
        confirmText="Send"
        variant="warning"
        loading={sending}
      >
        {needsTyping && (
          <div className="mt-2">
            <label className="block text-xs text-[#A0A0A0] mb-1.5">Type SEND to confirm</label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className={inputClass}
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
