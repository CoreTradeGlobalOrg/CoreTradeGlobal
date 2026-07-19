'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X as XIcon, ImagePlus, Trash2, Upload } from 'lucide-react';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';
import { COUNTRIES } from '@/core/constants/countries';

function getCountryLabel(countryCode) {
  if (!countryCode) return 'Not set';
  const country = COUNTRIES.find((c) => c.value === countryCode);
  return country ? country.label : countryCode;
}

function formatCategory(name) {
  if (!name) return 'Not set';
  return name.toUpperCase();
}

/**
 * EditableCell — tap-to-edit field cell used across the profile.
 *
 * View mode: shows the current value (or a "tap to add" hint) with a
 * small pencil affordance. The entire card is a tap target — mobile
 * users don't have to hunt for the pencil.
 *
 * Edit mode: swaps in the caller's `renderInput` and shows Cancel + Save
 * buttons. Cancel restores the previous value; Save calls `onSave(draft)`
 * (returning `true` on success) and exits edit mode. ESC = Cancel,
 * Enter = Save (except in the textarea variant).
 *
 * The parent owns the persisted `value`; local `draft` state is only
 * needed while the cell is being edited.
 */
function EditableCell({
  label,
  value,
  emptyHint,
  canEdit,
  highlight,
  privateBadge,
  saving,
  onSave,
  renderDisplay,
  renderInput,
  multiline = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const start = () => {
    if (!canEdit || editing) return;
    setDraft(value ?? '');
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setDraft(value ?? '');
  };
  const commit = async () => {
    const ok = await onSave(draft);
    if (ok !== false) setEditing(false);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
  };

  const highlightClass = highlight ? ' animate-highlight-incomplete border-2' : '';

  return (
    <div
      className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] transition-colors ${
        canEdit && !editing ? 'cursor-pointer hover:border-[rgba(255,215,0,0.3)] active:bg-[rgba(255,255,255,0.06)] group' : ''
      }${highlightClass}`}
      role={canEdit && !editing ? 'button' : undefined}
      tabIndex={canEdit && !editing ? 0 : undefined}
      onClick={canEdit && !editing ? start : undefined}
      onKeyDown={
        canEdit && !editing
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                start();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">
          {label}
        </p>
        {privateBadge && <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>}
        {canEdit && !editing && (
          <Pencil className="w-3.5 h-3.5 text-[#A0A0A0]/60 group-hover:text-[#FFD700] transition-colors ml-auto" />
        )}
      </div>

      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          {renderInput({ draft, setDraft, ref: inputRef, onKeyDown: onKey })}
          <div className="flex gap-2 justify-end mt-3">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60 transition-all"
            >
              <XIcon className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {value
            ? renderDisplay
              ? renderDisplay({ value })
              : <p className="text-white font-semibold text-lg truncate">{value}</p>
            : (
              <p className="text-[#A0A0A0] font-semibold text-lg">
                {canEdit ? emptyHint || 'Not set — tap to add' : 'Not set'}
              </p>
            )}
        </div>
      )}
    </div>
  );
}

/**
 * BioEditor — the profile bio slot. Structurally different from the
 * grid cells (full-width paragraph under the display name) so it gets
 * its own tap-to-edit shell instead of the card-shaped EditableCell.
 */
function BioEditor({ canEdit, value, draft, setDraft, saving, onSave, onReset, highlight }) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [editing]);

  const start = () => {
    if (!canEdit) return;
    setDraft(value || '');
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    onReset();
  };
  const commit = async () => {
    const ok = await onSave(draft);
    if (ok !== false) setEditing(false);
  };

  if (editing) {
    return (
      <div className={`mt-4 rounded-xl${highlight ? ' animate-highlight-incomplete border-2' : ''}`}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          placeholder="Tell us about yourself and your company..."
          className="w-full bg-[rgba(255,255,255,0.05)] border-2 border-[#FFD700]/50 rounded-xl p-4 text-white text-sm leading-relaxed placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700] resize-none min-h-[80px] overflow-hidden shadow-[0_0_15px_rgba(255,215,0,0.2)]"
        />
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60 transition-all"
          >
            <XIcon className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-4 rounded-xl px-2 py-2 -mx-2 ${
        canEdit ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.03)] group' : ''
      }${highlight ? ' animate-highlight-incomplete border-2' : ''}`}
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? start : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
            }
          : undefined
      }
    >
      <div className="flex items-start gap-2">
        <p className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap flex-1">
          {value || (canEdit ? 'Tap to add a brief overview of your company…' : 'Add a brief overview of your company…')}
        </p>
        {canEdit && <Pencil className="w-3.5 h-3.5 text-[#A0A0A0]/60 group-hover:text-[#FFD700] transition-colors flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
}

/**
 * LogoActionMenu — pencil button pinned to the bottom-right corner of the
 * profile logo. Opens a small popover with Change / Remove actions (or a
 * single Upload action when no logo is set yet).
 *
 * Replaces the always-visible Change/Remove/Upload pills the card used to
 * show — those got easy to miss on mobile after the global Save button
 * was removed. A pencil is the universal "edit" affordance so users don't
 * have to hunt for it.
 */
function LogoActionMenu({ hasLogo, disabled, onChangeFile, onRemove }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close on outside click OR ESC. Both are captured at the document level
  // so the menu never gets stuck open behind another interaction.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerFilePick = () => {
    setOpen(false);
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setOpen(false);
    onRemove?.();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onChangeFile}
        className="sr-only"
        disabled={disabled}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-label="Edit photo"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FFD700] text-[#0F1B2B] shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed z-10"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-full mt-2 right-0 min-w-[180px] rounded-xl border border-[rgba(255,215,0,0.3)] bg-[#0F1B2B] shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden z-20"
        >
          {hasLogo ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={triggerFilePick}
                disabled={disabled}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white hover:bg-[rgba(255,215,0,0.1)] transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4 text-[#FFD700]" />
                Change photo
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleRemove}
                disabled={disabled}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors border-t border-[rgba(255,255,255,0.06)] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove photo
              </button>
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={triggerFilePick}
              disabled={disabled}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white hover:bg-[rgba(255,215,0,0.1)] transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#FFD700]" />
              Upload photo
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * ProfileCard - The main profile info card with logo, bio, and editable fields.
 * Covers: logo, name, bio, and the 2x2 detail grid.
 */
export function ProfileCard({
  profileUser,
  categoryName,
  canEdit,
  isEditing,
  isOwnProfile,
  // Form state
  phone,
  setPhone,
  about,
  setAbout,
  linkedinProfile,
  setLinkedinProfile,
  companyWebsite,
  setCompanyWebsite,
  // Logo state
  logoLoading,
  logoPreview,
  profileUpdating,
  // Handlers
  onEditToggle,
  onLogoChange,
  onRemoveLogo,
  onProfileUpdate,
  onCancelEdit,
  onFieldSave,
  highlightFields = new Set(),
}) {
  const hl = (field) =>
    highlightFields.has(field) ? ' animate-highlight-incomplete border-2' : '';
  return (
    <div className="glass-card p-6">
      <div>
        {/* Header Row: Logo + Name + Edit Button */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
          {/* Logo Section */}
          <div className={`flex-shrink-0 rounded-2xl${hl('companyLogo')}`}>
            <div className="relative">
              {(logoPreview || profileUser?.companyLogo) ? (
                <img
                  src={logoPreview || profileUser?.companyLogo}
                  alt="Company logo"
                  width={96}
                  height={96}
                  className={`w-24 h-24 object-cover rounded-2xl border-2 border-[rgba(255,215,0,0.3)] transition-opacity ${logoLoading ? 'opacity-40' : 'opacity-100'}`}
                />
              ) : (
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center transition-opacity ${logoLoading ? 'opacity-40' : 'opacity-100'}`}>
                  <span className="text-4xl">🏭</span>
                </div>
              )}

              {/* Upload skeleton overlay — sits on top of the preview so the
                  user sees the picked image dimmed with a clear "in progress"
                  cue. Shimmer + spinner + label together, so it can't be
                  missed on mobile. */}
              {logoLoading && (
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-[#FFD700] bg-[rgba(15,27,43,0.55)] backdrop-blur-[2px] overflow-hidden flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(255,215,0,0.15)] to-transparent -translate-x-full animate-shimmer" />
                  <div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-semibold text-[#FFD700] uppercase tracking-wider">
                    Uploading
                  </span>
                </div>
              )}

              {canEdit && !logoLoading && (
                <LogoActionMenu
                  hasLogo={!!(logoPreview || profileUser?.companyLogo)}
                  disabled={profileUpdating}
                  onChangeFile={onLogoChange}
                  onRemove={onRemoveLogo}
                />
              )}
            </div>
          </div>

          {/* Name & Bio Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {profileUser?.displayName || 'User'}
                </h2>
                <p className="text-[#FFD700] font-medium">
                  {profileUser?.companyName || 'No company'}
                  {profileUser?.position && <span className="text-[#A0A0A0]"> • {profileUser.position}</span>}
                </p>
              </div>
              {canEdit && (
                <p className="hidden sm:block flex-shrink-0 text-xs text-[#A0A0A0]/70 self-start pt-2">
                  Tap any field to edit
                </p>
              )}
            </div>

            {/* Bio — tap to edit inline (no card wrapper to preserve
                the airier look under the display name). */}
            <BioEditor
              canEdit={canEdit}
              value={profileUser?.about}
              draft={about}
              setDraft={setAbout}
              saving={profileUpdating}
              onSave={async (v) => (onFieldSave ? await onFieldSave('about', v) : false)}
              onReset={() => setAbout(profileUser?.about || '')}
              highlight={highlightFields.has('about')}
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('companyName')}`}>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Company</p>
            <p className="text-white font-semibold text-lg truncate">{profileUser?.companyName || 'Not set'}</p>
          </div>

          <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Category</p>
            <p className="text-white font-semibold text-lg truncate">{formatCategory(categoryName)}</p>
          </div>

          <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Role</p>
            <RoleBadge role={profileUser?.role} size="md" />
          </div>

          <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('country')}`}>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Country</p>
            <p className="text-white font-semibold text-lg truncate">{getCountryLabel(profileUser?.country)}</p>
          </div>

          {canEdit && (
            <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Email</p>
                <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>
              </div>
              <p className="text-white font-semibold text-lg truncate">{profileUser?.email || 'Not set'}</p>
            </div>
          )}

          {canEdit && (
            <EditableCell
              label="Phone"
              privateBadge
              value={profileUser?.phone}
              emptyHint="Not set — tap to add"
              canEdit={canEdit}
              highlight={highlightFields.has('phone')}
              saving={profileUpdating}
              onSave={async (v) => (onFieldSave ? await onFieldSave('phone', v) : false)}
              renderInput={({ draft, setDraft, ref, onKeyDown }) => (
                <input
                  ref={ref}
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="+1 234 567 8900"
                  className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-lg focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2"
                />
              )}
            />
          )}

          <EditableCell
            label="LinkedIn"
            value={profileUser?.linkedinProfile}
            emptyHint="Not set — tap to add LinkedIn"
            canEdit={canEdit}
            saving={profileUpdating}
            onSave={async (v) => (onFieldSave ? await onFieldSave('linkedinProfile', v) : false)}
            renderInput={({ draft, setDraft, ref, onKeyDown }) => (
              <input
                ref={ref}
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="linkedin.com/in/yourprofile"
                className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2"
              />
            )}
            renderDisplay={({ value: v }) => (
              <a
                href={v}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#0A66C2] font-semibold text-base truncate block hover:underline"
              >
                {v.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
          />

          <EditableCell
            label="Website"
            value={profileUser?.companyWebsite}
            emptyHint="Not set — tap to add website"
            canEdit={canEdit}
            highlight={highlightFields.has('companyWebsite')}
            saving={profileUpdating}
            onSave={async (v) => (onFieldSave ? await onFieldSave('companyWebsite', v) : false)}
            renderInput={({ draft, setDraft, ref, onKeyDown }) => (
              <input
                ref={ref}
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="www.company.com"
                className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2"
              />
            )}
            renderDisplay={({ value: v }) => (
              <a
                href={v}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#FFD700] font-semibold text-base truncate block hover:underline"
              >
                {v.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
          />
        </div>

      </div>
    </div>
  );
}
