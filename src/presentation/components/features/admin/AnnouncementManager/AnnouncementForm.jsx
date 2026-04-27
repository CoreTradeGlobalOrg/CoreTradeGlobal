'use client';

/**
 * AnnouncementForm
 *
 * Admin form for creating and sending system announcements.
 * Supports immediate send and scheduled delivery via the sendAnnouncement Cloud Function.
 *
 * Fields: title, body, audience, channels (in-app, push, email), optional schedule.
 */

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Bell, Smartphone, Mail, Send, CalendarClock } from 'lucide-react';
import { functions } from '@/core/config/firebase.config';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'member', label: 'Members' },
  { value: 'logistics_provider', label: 'Logistics Providers' },
  { value: 'insurance_provider', label: 'Insurance Providers' },
  { value: 'lawyer', label: 'Lawyers' },
];

const INITIAL_STATE = {
  title: '',
  body: '',
  audience: 'all',
  channels: { inApp: true, push: false, email: false },
  sendLater: false,
  scheduledFor: '',
};

export default function AnnouncementForm({ onSent }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleChannelToggle(channel) {
    setForm((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: !prev.channels[channel] },
    }));
  }

  function isValid() {
    if (!form.title.trim()) return false;
    if (!form.body.trim()) return false;
    if (!form.channels.inApp && !form.channels.push && !form.channels.email) return false;
    if (form.sendLater && !form.scheduledFor) return false;
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid()) {
      toast.error('Please fill in all required fields and select at least one channel.');
      return;
    }

    setLoading(true);
    try {
      const sendAnnouncement = httpsCallable(functions, 'sendAnnouncement');

      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        channels: form.channels,
        scheduledFor: form.sendLater && form.scheduledFor ? form.scheduledFor : null,
      };

      const result = await sendAnnouncement(payload);
      const { status, recipientCount } = result.data;

      if (status === 'scheduled') {
        toast.success('Announcement scheduled successfully.');
      } else {
        toast.success(`Announcement sent to ${recipientCount} recipient(s).`);
      }

      setForm(INITIAL_STATE);
      if (onSent) onSent();
    } catch (err) {
      console.error('AnnouncementForm: sendAnnouncement error:', err);
      toast.error(err?.message || 'Failed to send announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? 'Sending...'
    : form.sendLater
    ? 'Schedule Announcement'
    : 'Send Announcement';

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
        <Send className="w-4 h-4 text-[#FFD700]" />
        New Announcement
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Announcement title"
            maxLength={120}
            disabled={loading}
            className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Message Body <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.body}
            onChange={(e) => handleChange('body', e.target.value)}
            placeholder="Write your announcement message here..."
            rows={4}
            maxLength={1000}
            disabled={loading}
            className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50 transition-colors resize-none disabled:opacity-50"
          />
          <p className="text-xs text-[#5a5a5a] text-right mt-1">{form.body.length}/1000</p>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Audience
          </label>
          <select
            value={form.audience}
            onChange={(e) => handleChange('audience', e.target.value)}
            disabled={loading}
            className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors disabled:opacity-50"
          >
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a2a3a]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-2">
            Channels <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'inApp', label: 'In-app notification', Icon: Bell },
              { key: 'push', label: 'Push notification', Icon: Smartphone },
              { key: 'email', label: 'Email', Icon: Mail },
            ].map(({ key, label, Icon }) => (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  form.channels[key]
                    ? 'border-[#FFD700]/50 bg-[#FFD700]/5 text-[#FFD700]'
                    : 'border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:border-[rgba(255,255,255,0.2)]'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.channels[key]}
                  onChange={() => handleChannelToggle(key)}
                  disabled={loading}
                  className="sr-only"
                />
                <Icon className="w-4 h-4" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Schedule toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.sendLater}
              onChange={(e) => handleChange('sendLater', e.target.checked)}
              disabled={loading}
              className="w-4 h-4 accent-[#FFD700]"
            />
            <span className="text-sm text-[#A0A0A0] flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              Send later (schedule for future date/time)
            </span>
          </label>

          {form.sendLater && (
            <div className="mt-3">
              <input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => handleChange('scheduledFor', e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                disabled={loading}
                className="w-full sm:w-auto bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors disabled:opacity-50"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading || !isValid()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FFD700] hover:bg-[#B59325] !text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
