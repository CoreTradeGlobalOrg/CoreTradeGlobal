/**
 * OnboardingTour Component
 *
 * A React Portal-based 3-part guided tour with Turkish content.
 * Covers: Profile Creation (4 steps), Product Upload (3 steps), RFQ Creation (3 steps).
 * Shows an intro screen before Part 1 and transition screens between parts.
 *
 * Usage:
 *   <OnboardingTour user={user} onComplete={() => {}} />
 *
 * Also exports TourHelpButton — a "?" FAB for relaunching the tour.
 *   <TourHelpButton onLaunch={() => setShowTour(true)} />
 *
 * Writes `onboardingTourCompleted: true` to Firestore on skip or finish.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import './OnboardingTour.css';

/**
 * Flat sequence of screens.
 * type: 'intro' | 'transition' | 'step'
 * part: which part this belongs to (1 | 2 | 3)
 * partStep: step number within the part (1-indexed)
 * partTotal: total steps in the part
 * isLastInPart: true if this is the final step of its part
 */
const TOUR_SEQUENCE = [
  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'intro',
    part: 1,
    title: 'CoreTG Kullanma Rehberine Hoşgeldiniz',
    description:
      'Bu rehber, platformumuzu en verimli şekilde kullanmanız için size adım adım yol gösterecek. Haydi başlayalım!',
  },

  // ── Part 1: Profil Oluşturma Rehberi (4 steps) ─────────────────────────────
  {
    type: 'step',
    part: 1,
    partStep: 1,
    partTotal: 4,
    isLastInPart: false,
    title: 'Şirket Profilinizi Tamamlayın',
    description:
      'Kuruluş yılı, faaliyet sektörü ve ihracat pazarlarınız gibi temel bilgileri girerek profilinizi oluşturun.',
    targetSelector: '[href="/profile"], [href*="/profile"]',
    placement: 'bottom',
  },
  {
    type: 'step',
    part: 1,
    partStep: 2,
    partTotal: 4,
    isLastInPart: false,
    title: 'Güven Oluşturun',
    description:
      'Sahip olduğunuz sertifikaları (ISO, CE, vb.), üretim kapasitenizi ve kalite belgelerinizi ekleyin. Bu bilgiler, potansiyel alıcıların size güven duymasını sağlar.',
    targetSelector: '[href="/profile"], [href*="/profile"]',
    placement: 'bottom',
  },
  {
    type: 'step',
    part: 1,
    partStep: 3,
    partTotal: 4,
    isLastInPart: false,
    title: 'Görsel Prestij',
    description:
      'Şirket logonuzu ve kapak fotoğrafınızı yükleyin. Profesyonel bir görünüm, ilk izleniminizi güçlendirir.',
    targetSelector: '[href="/profile"], [href*="/profile"]',
    placement: 'bottom',
  },
  {
    type: 'step',
    part: 1,
    partStep: 4,
    partTotal: 4,
    isLastInPart: true,
    title: 'Profilinizi Özetleyin',
    description:
      'Hakkımızda bölümünü yazın ve ihracat yaptığınız pazarları belirtin. Tamamlanmış bir profil, görünürlüğünüzü artırır.',
    targetSelector: '[href="/profile"], [href*="/profile"]',
    placement: 'bottom',
  },

  // ── Transition 1 → 2 ───────────────────────────────────────────────────────
  {
    type: 'transition',
    part: 1,
    title: 'Profiliniz tamamlandı!',
    description:
      'Profiliniz tamamlandı! Şimdi nasıl ürün ve Talep (RFQ) oluşturacağınızı göstereceğiz.',
  },

  // ── Part 2: Ürün Ekleme Rehberi (3 steps) ──────────────────────────────────
  {
    type: 'step',
    part: 2,
    partStep: 1,
    partTotal: 3,
    isLastInPart: false,
    title: "CoreTG'ye Hoşgeldiniz",
    description:
      "Ürünlerinizi platformumuza eklemek için 'Ürün Ekle' butonunu kullanın.",
    targetSelector: '[href="/marketplace"], [href*="/marketplace"]',
    placement: 'bottom',
  },
  {
    type: 'step',
    part: 2,
    partStep: 2,
    partTotal: 3,
    isLastInPart: false,
    title: 'Ürün Bilgilerini Doldurun',
    description:
      'Ürün adı, açıklaması, kategorisi, fiyatı ve görsellerini ekleyin. Detaylı bilgi, alıcıların ilgisini çeker.',
    targetSelector: null,
    placement: 'center',
  },
  {
    type: 'step',
    part: 2,
    partStep: 3,
    partTotal: 3,
    isLastInPart: true,
    title: 'Ürününüzü Yayınlayın',
    description:
      "Tüm bilgileri kontrol ettikten sonra 'Yayınla' butonuna tıklayarak ürününüzü görünür hale getirin.",
    targetSelector: null,
    placement: 'center',
  },

  // ── Transition 2 → 3 ───────────────────────────────────────────────────────
  {
    type: 'transition',
    part: 2,
    title: 'Harika!',
    description: 'Harika! Şimdi bir RFQ (Talep Teklifi) nasıl oluşturacağınızı görelim.',
  },

  // ── Part 3: RFQ Oluşturma Rehberi (3 steps) ────────────────────────────────
  {
    type: 'step',
    part: 3,
    partStep: 1,
    partTotal: 3,
    isLastInPart: false,
    title: 'İhtiyacınızı Yayınlayın',
    description:
      "RFQ oluşturarak tedarikçilerden teklif alın. 'RFQ Oluştur' butonuna tıklayın.",
    targetSelector: '[href="/requests"], [href*="/requests"]',
    placement: 'bottom',
  },
  {
    type: 'step',
    part: 3,
    partStep: 2,
    partTotal: 3,
    isLastInPart: false,
    title: 'Miktar ve Teslimat Detayları',
    description:
      'İhtiyacınız olan ürün miktarını, teslimat tarihini ve konumunu belirtin.',
    targetSelector: null,
    placement: 'center',
  },
  {
    type: 'step',
    part: 3,
    partStep: 3,
    partTotal: 3,
    isLastInPart: true,
    title: 'Talebinizi Yayınlayın',
    description:
      "Tüm detayları kontrol edip 'Yayınla' butonuyla talebinizi tedarikçilere ulaştırın.",
    targetSelector: null,
    placement: 'center',
  },
];

/** Padding added around the target element for the spotlight cutout */
const SPOTLIGHT_PADDING = 8;

/**
 * Calculate the panel position based on target rect and desired placement.
 * Returns centered style when placement is 'center' or no targetRect.
 */
function getPanelStyle(targetRect, placement, panelWidth = 340, panelHeight = 220) {
  if (!targetRect || placement === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  const centerX = targetRect.left + targetRect.width / 2;
  let left = centerX - panelWidth / 2;
  left = Math.max(12, Math.min(left, vw - panelWidth - 12));

  if (placement === 'bottom') {
    const top = targetRect.bottom + gap;
    if (top + panelHeight < vh) return { top, left };
    const topAlt = targetRect.top - gap - panelHeight;
    if (topAlt > 0) return { top: topAlt, left };
  }

  if (placement === 'top') {
    const top = targetRect.top - gap - panelHeight;
    if (top > 0) return { top, left };
    return { top: targetRect.bottom + gap, left };
  }

  return {
    top: Math.max(12, targetRect.bottom + gap),
    left,
  };
}

/**
 * OnboardingTour
 *
 * Props:
 *   user     — authenticated user object (must have uid)
 *   onComplete — called when tour is finished or skipped
 */
export function OnboardingTour({ user, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const rafRef = useRef(null);

  const screen = TOUR_SEQUENCE[currentIndex];
  const isModal = screen?.type === 'intro' || screen?.type === 'transition';

  /** Find target element and update spotlight rect */
  const updateRect = useCallback(() => {
    if (!screen || isModal || !screen.targetSelector || screen.placement === 'center') {
      setTargetRect(null);
      return;
    }
    const selectors = screen.targetSelector.split(',').map((s) => s.trim());
    let el = null;
    for (const sel of selectors) {
      try {
        el = document.querySelector(sel);
        if (el) break;
      } catch {
        // Invalid selector — skip
      }
    }
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [screen, isModal]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => updateRect());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect, currentIndex]);

  useEffect(() => {
    const handleUpdate = () => updateRect();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [updateRect]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /** Write completion flag to Firestore and call onComplete */
  const completeTour = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingTourCompleted: true,
          onboardingTourCompletedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('OnboardingTour: failed to write completion flag', err);
    } finally {
      setSaving(false);
      onComplete?.();
    }
  }, [user?.uid, onComplete, saving]);

  const handleAdvance = () => {
    if (currentIndex < TOUR_SEQUENCE.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!mounted || !screen) return null;

  // ── Spotlight calculation ───────────────────────────────────────────────────
  const spotlightStyle =
    !isModal && targetRect
      ? {
          top: targetRect.top - SPOTLIGHT_PADDING,
          left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2,
          height: targetRect.height + SPOTLIGHT_PADDING * 2,
        }
      : { top: -9999, left: -9999, width: 0, height: 0 };

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* Dark overlay */}
      <div className="onboarding-overlay" aria-hidden="true" />

      {/* Spotlight cutout — hidden for modal screens */}
      {!isModal && <div className="onboarding-spotlight" style={spotlightStyle} aria-hidden="true" />}

      {/* Intro modal */}
      {screen.type === 'intro' && (
        <div
          className="onboarding-panel onboarding-panel-enter"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 400 }}
          role="dialog"
          aria-modal="true"
          aria-label="Rehber başlangıç ekranı"
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-7 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FDB931] flex items-center justify-center mx-auto mb-5">
              <span className="text-black text-2xl font-bold">?</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-3">{screen.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{screen.description}</p>
            <button
              onClick={handleAdvance}
              disabled={saving}
              className="w-full px-5 py-3 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Başla
            </button>
          </div>
        </div>
      )}

      {/* Transition modal */}
      {screen.type === 'transition' && (
        <div
          className="onboarding-panel onboarding-panel-enter"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 400 }}
          role="dialog"
          aria-modal="true"
          aria-label="Bölüm geçiş ekranı"
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-7 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg mb-3">{screen.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{screen.description}</p>
            <button
              onClick={handleAdvance}
              disabled={saving}
              className="w-full px-5 py-3 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* Step panel */}
      {screen.type === 'step' && (
        <div
          className="onboarding-panel onboarding-panel-enter"
          style={getPanelStyle(targetRect, screen.placement)}
          role="dialog"
          aria-modal="true"
          aria-label={`Adım ${screen.partStep}/${screen.partTotal}: ${screen.title}`}
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#2A3B52] rounded-xl p-5 shadow-2xl">
            {/* Part label + step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#FFD700] font-medium tracking-wide uppercase">
                Adım {screen.partStep}/{screen.partTotal}
              </span>
              {/* Progress dots within the part */}
              <div className="flex gap-1">
                {Array.from({ length: screen.partTotal }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === screen.partStep - 1
                        ? 'w-4 bg-[#FFD700]'
                        : i < screen.partStep - 1
                        ? 'w-1.5 bg-[#FFD700]/50'
                        : 'w-1.5 bg-[#2A3B52]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-white font-bold text-base mb-2">{screen.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">{screen.description}</p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-gray-400 text-sm underline underline-offset-2 hover:text-gray-200 transition-colors"
                disabled={saving}
              >
                Atla
              </button>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {screen.isLastInPart && screen.part === 3 ? 'Bitir' : screen.isLastInPart ? 'Bitir' : 'Sonraki'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/**
 * TourHelpButton
 *
 * A fixed "?" FAB button on the bottom-left corner that relaunches the tour.
 * Only render for authenticated users.
 *
 * Props:
 *   onLaunch — called when user clicks the button
 */
export function TourHelpButton({ onLaunch }) {
  return (
    <button
      onClick={onLaunch}
      aria-label="Rehberi başlat"
      className="fixed bottom-6 left-6 z-[100] w-12 h-12 rounded-full !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center font-bold text-xl"
    >
      ?
    </button>
  );
}

export default OnboardingTour;
