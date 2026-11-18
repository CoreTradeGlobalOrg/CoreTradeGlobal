'use client';

/**
 * TemplateEditor
 *
 * Raw-HTML email template editor with a live preview. The preview renders
 * the HTML with the sample variables in a fully sandboxed iframe (no
 * scripts, no same-origin access), at desktop or phone width. "Send test to
 * me" sends the current, possibly unsaved, version through
 * sendAdminTestEmail from the chosen sender.
 */

import { useState, useDeferredValue, useMemo, useRef } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, Send, Save, Trash2, Monitor, Smartphone, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import {
  BUILT_IN_VARIABLES,
  MAX_HTML_BYTES,
  byteSize,
  findVariables,
  lintTemplate,
  renderTemplate,
} from '@/lib/email/adminEmailTemplate';

const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#ffffff;color:#1a1a1a;">
  <p>Hello {{firstName}},</p>
  <p>Write your message here.</p>
  <p>Best regards,<br>CoreTradeGlobal</p>
</body>
</html>
`;

const inputClass =
  'w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50 transition-colors disabled:opacity-50';
const labelClass = 'block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5';

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function TemplateEditor({ template, senders, onClose }) {
  const { user } = useAuth();
  const [templateId, setTemplateId] = useState(template?.id || null);
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [html, setHtml] = useState(template?.html ?? STARTER_HTML);
  const [saved, setSaved] = useState(
    template ? { name: template.name || '', subject: template.subject || '', html: template.html || '' } : null
  );
  const [sampleVars, setSampleVars] = useState(() => ({
    firstName: user?.firstName || 'Jane',
    lastName: user?.lastName || 'Doe',
    companyName: user?.companyName || 'Example Trading Ltd',
    email: user?.email || 'jane@example.com',
  }));
  const [senderId, setSenderId] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const fileInputRef = useRef(null);

  // Typing in a large HTML document should not wait for the preview to re-render.
  const deferredHtml = useDeferredValue(html);
  const deferredSubject = useDeferredValue(subject);

  const variables = useMemo(
    () => [...new Set([...BUILT_IN_VARIABLES, ...findVariables(deferredSubject, deferredHtml)])],
    [deferredSubject, deferredHtml]
  );
  const previewHtml = useMemo(
    () => renderTemplate(deferredHtml, sampleVars, { escape: true }),
    [deferredHtml, sampleVars]
  );
  const issues = useMemo(
    () => lintTemplate({ subject: deferredSubject, html: deferredHtml }),
    [deferredSubject, deferredHtml]
  );

  const activeSenders = senders.filter((s) => s.active !== false);
  // Senders can arrive after mount; fall back to the first active one.
  const effectiveSenderId = activeSenders.some((s) => s.id === senderId) ? senderId : activeSenders[0]?.id || '';
  const sender = activeSenders.find((s) => s.id === effectiveSenderId);

  const dirty = !saved || saved.name !== name || saved.subject !== subject || saved.html !== html;
  const htmlBytes = useMemo(() => byteSize(deferredHtml), [deferredHtml]);

  function handleClose() {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_HTML_BYTES) {
      toast.error(`${file.name} is larger than ${formatKb(MAX_HTML_BYTES)}.`);
      return;
    }
    if (html.trim() && html !== STARTER_HTML && !window.confirm(`Replace the current HTML with ${file.name}?`)) return;
    try {
      setHtml(await file.text());
    } catch (err) {
      console.error('TemplateEditor: file read error:', err);
      toast.error('Could not read the file.');
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedName) {
      toast.error('Give the template a name.');
      return;
    }
    if (byteSize(html) > MAX_HTML_BYTES) {
      toast.error(`HTML is larger than ${formatKb(MAX_HTML_BYTES)}.`);
      return;
    }

    const fields = {
      name: trimmedName,
      subject: trimmedSubject,
      html,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    };

    setSaving(true);
    try {
      if (templateId) {
        await updateDoc(doc(db, 'emailTemplates', templateId), fields);
      } else {
        const ref = await addDoc(collection(db, 'emailTemplates'), {
          ...fields,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });
        setTemplateId(ref.id);
      }
      setName(trimmedName);
      setSubject(trimmedSubject);
      setSaved({ name: trimmedName, subject: trimmedSubject, html });
      toast.success('Template saved.');
    } catch (err) {
      console.error('TemplateEditor: save error:', err);
      toast.error(err?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!templateId) return;
    if (!window.confirm(`Delete template "${name || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'emailTemplates', templateId));
      toast.success('Template deleted.');
      onClose();
    } catch (err) {
      console.error('TemplateEditor: delete error:', err);
      toast.error(err?.message || 'Failed to delete template.');
    }
  }

  async function handleTest() {
    if (!effectiveSenderId) {
      toast.error('Add an active sender in the Senders tab first.');
      return;
    }
    const firstError = lintTemplate({ subject, html }).find((i) => i.level === 'error');
    if (firstError) {
      toast.error(firstError.message);
      return;
    }

    setTesting(true);
    try {
      const sendAdminTestEmail = httpsCallable(getFunctionsInstance(), 'sendAdminTestEmail');
      const { data } = await sendAdminTestEmail({ senderId: effectiveSenderId, subject, html, vars: sampleVars });
      if (data.ok) toast.success(`Test sent to ${data.to}.`);
      else toast.error(`Test failed: ${data.error}`);
    } catch (err) {
      console.error('TemplateEditor: test send error:', err);
      toast.error(err?.message || 'Failed to send test.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#A0A0A0] hover:text-white border border-[rgba(255,255,255,0.1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Templates
        </button>
        <h3 className="text-base font-semibold text-white truncate min-w-0 flex-1">
          {templateId ? name || 'Untitled template' : 'New template'}
          {dirty && <span className="ml-2 text-xs font-medium text-[#FFD700]">Unsaved changes</span>}
        </h3>
        {templateId && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#A0A0A0] hover:text-red-400 border border-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: fields */}
        <div className="space-y-4 min-w-0">
          <div>
            <label className={labelClass}>Template name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fair follow-up"
              maxLength={120}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Subject <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Your CoreTradeGlobal account, {{firstName}}"
              maxLength={300}
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className={`${labelClass} mb-0`}>HTML <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${htmlBytes > MAX_HTML_BYTES ? 'text-red-400' : 'text-[#5a6a7a]'}`}>
                  {formatKb(htmlBytes)}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload .html
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>
            </div>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              placeholder="Paste your email HTML here"
              className={`${inputClass} font-mono text-xs leading-relaxed h-[420px] xl:h-[560px] resize-y whitespace-pre`}
            />
          </div>

          <div>
            <p className={labelClass}>Sample values for the preview and test</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {variables.map((key) => (
                <div key={key}>
                  <label className="block text-xs text-[#5a6a7a] mb-1 font-mono">{`{{${key}}}`}</label>
                  <input
                    type="text"
                    value={sampleVars[key] || ''}
                    onChange={(e) => setSampleVars((prev) => ({ ...prev, [key]: e.target.value }))}
                    maxLength={1000}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Preview</p>
              <div className="flex gap-1">
                {[
                  { id: 'desktop', label: 'Desktop', Icon: Monitor },
                  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPreviewMode(id)}
                    aria-pressed={previewMode === id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      previewMode === id
                        ? 'border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700]'
                        : 'border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs space-y-1 border-b border-[rgba(255,255,255,0.08)] pb-3">
              <p className="text-[#A0A0A0] break-all">
                <span className="text-[#5a6a7a]">From: </span>
                {sender ? `${sender.displayName || ''} <${sender.address}>` : 'No active sender'}
              </p>
              <p className="text-white break-words">
                <span className="text-[#5a6a7a]">Subject: </span>
                {renderTemplate(deferredSubject, sampleVars, { escape: false }) || '(empty)'}
              </p>
            </div>

            <div className={previewMode === 'mobile' ? 'w-[375px] max-w-full mx-auto' : 'w-full'}>
              <iframe
                title="Email preview"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={previewHtml}
                className="w-full h-[640px] rounded-lg bg-white border border-[rgba(255,255,255,0.1)]"
              />
            </div>
          </div>

          {/* Checks */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-2">
            <p className="text-sm font-semibold text-white">Checks</p>
            {issues.length === 0 ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                No problems found.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {issues.map((issue) => (
                  <li
                    key={issue.message}
                    className={`flex items-start gap-1.5 text-xs ${issue.level === 'error' ? 'text-red-400' : 'text-yellow-400'}`}
                  >
                    {issue.level === 'error' ? (
                      <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    )}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Test send */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Send a test</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={effectiveSenderId}
                onChange={(e) => setSenderId(e.target.value)}
                disabled={activeSenders.length === 0 || testing}
                className={`${inputClass} sm:flex-1`}
              >
                {activeSenders.length === 0 && <option value="">No active senders</option>}
                {activeSenders.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#1a2a3a]">
                    {s.displayName ? `${s.displayName} <${s.address}>` : s.address}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || activeSenders.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {testing ? 'Sending...' : 'Send test to me'}
              </button>
            </div>
            <p className="text-xs text-[#5a6a7a]">
              Sends the current version (saved or not) to {user?.email || 'your address'}, with the sample values above. The subject is prefixed with [TEST].
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
