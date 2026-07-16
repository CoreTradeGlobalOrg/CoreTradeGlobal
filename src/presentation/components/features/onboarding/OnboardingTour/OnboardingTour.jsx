/**
 * OnboardingTour Component
 *
 * A React Portal-based 3-part guided tour with English content.
 * Covers: Profile Creation (4 steps), Product Upload (3 steps), RFQ Creation (3 steps).
 * Shows an intro screen before Part 1 and a transition screen between Part 1 and Part 2.
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
import { useRouter } from 'next/navigation';
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
 * subtitle: optional subtitle displayed below the title
 * placement: 'top-right' | 'anchor-sell' | 'anchor-buy' | 'center'
 */
const TOUR_SEQUENCE = [
  // -- Intro ------------------------------------------------------------------
  {
    type: 'intro',
    part: 1,
    title: 'Welcome to CoreTradeGlobal Guide',
    description:
      'Follow the steps in our guide to complete your profile:',
  },

  // -- Part 1: Profile Creation Guide (4 steps) ------------------------------
  {
    type: 'step',
    part: 1,
    partStep: 1,
    partTotal: 4,
    isLastInPart: false,
    title: 'Complete Your Company Profile',
    subtitle: null,
    description:
      "Welcome! Let's complete your profile together. Enter your founding year and your main industry. This information will be your key identity in search results.",
    placement: 'top-right',
    actionLabel: 'Go to Profile',
    actionPath: '/profile',
  },
  {
    type: 'step',
    part: 1,
    partStep: 2,
    partTotal: 4,
    isLastInPart: false,
    title: 'Build Trust',
    subtitle: 'Why You?',
    description:
      'Trust is everything in the B2B world. Add your quality certificates like ISO, CE and your production capacity. Remember, certified profiles get 70% more attention.',
    placement: 'top-right',
    actionLabel: 'Go to Profile',
    actionPath: '/profile',
  },
  {
    type: 'step',
    part: 1,
    partStep: 3,
    partTotal: 4,
    isLastInPart: false,
    title: 'Visual Prestige',
    subtitle: 'Shine Your Brand',
    description:
      'Upload your company logo and a stylish cover photo representing your factory or office for a professional look. The clearer your visuals, the more your professionalism is felt.',
    placement: 'top-right',
    actionLabel: 'Go to Profile',
    actionPath: '/profile',
  },
  {
    type: 'step',
    part: 1,
    partStep: 4,
    partTotal: 4,
    isLastInPart: true,
    title: 'Summary',
    subtitle: 'Tell Your Story',
    description:
      "Write your company summary in the 'About Us' section. Specify which markets you export to or what values you stand for. Congratulations, you're ready to go global!",
    placement: 'top-right',
    actionLabel: 'Go to Profile',
    actionPath: '/profile',
  },

  // -- Transition 1 -> 2 -----------------------------------------------------
  {
    type: 'transition',
    part: 1,
    title: 'Your profile is complete!',
    description:
      "Now we'll show you how to create products and RFQ requests with a short guide.",
  },

  // -- Part 2: Product Upload Guide (3 steps) --------------------------------
  {
    type: 'step',
    part: 2,
    partStep: 1,
    partTotal: 3,
    isLastInPart: false,
    title: 'Welcome to CoreTradeGlobal World',
    subtitle: null,
    description:
      "Follow the steps to upload your first product. You can start creating your digital showroom from the 'Add Product' panel.",
    placement: 'anchor-sell',
  },
  {
    type: 'step',
    part: 2,
    partStep: 2,
    partTotal: 3,
    isLastInPart: false,
    title: "Let's Upload Your First Product Together",
    subtitle: null,
    description:
      'Fill in the product information in the boxes on the page, upload the product image.',
    placement: 'center',
  },
  {
    type: 'step',
    part: 2,
    partStep: 3,
    partTotal: 3,
    isLastInPart: true,
    title: 'Publish Your Product!',
    subtitle: "That's It!",
    description:
      "If you've checked your information, press the 'Add Product' button. Your first product is now accessible to global buyers in the CoreTradeGlobal world. Good luck!",
    placement: 'center',
  },

  // -- Part 3: RFQ Creation Guide (3 steps) ----------------------------------
  {
    type: 'step',
    part: 3,
    partStep: 1,
    partTotal: 3,
    isLastInPart: false,
    title: 'Publish Your Need',
    subtitle: null,
    description:
      "Create an RFQ (Request) on CoreTradeGlobal to receive offers from thousands of suppliers. Let's start by defining the product you need.",
    placement: 'anchor-buy',
  },
  {
    type: 'step',
    part: 3,
    partStep: 2,
    partTotal: 3,
    isLastInPart: false,
    title: 'Quantity and Delivery',
    subtitle: 'Clarify the Details',
    description:
      'How many products do you need and by when should they be delivered? Write your material quality, certificates or packaging preferences in this area. These details ensure suppliers give you the most accurate price.',
    placement: 'center',
  },
  {
    type: 'step',
    part: 3,
    partStep: 3,
    partTotal: 3,
    isLastInPart: true,
    title: 'Publish the Request',
    subtitle: "You're Ready to Reach Suppliers!",
    description:
      "When your request is published, relevant manufacturers will receive instant notifications. You can track offers from the 'My Requests' section in your profile.",
    placement: 'center',
  },
];

/** Padding added around the target element for the spotlight cutout */
const SPOTLIGHT_PADDING = 8;

/**
 * Calculate the panel position based on placement type and optional target rect.
 */
function getPanelStyle(placement, targetRect) {
  // Top-right positioning for profile steps
  if (placement === 'top-right') {
    return { top: 80, right: 24, left: 'auto' };
  }

  // Anchor to a specific hero button
  if ((placement === 'anchor-sell' || placement === 'anchor-buy') && targetRect) {
    const vw = window.innerWidth;
    const panelWidth = 340;
    const gap = 16;

    const centerX = targetRect.left + targetRect.width / 2;
    let left = centerX - panelWidth / 2;
    left = Math.max(12, Math.min(left, vw - panelWidth - 12));

    const top = targetRect.bottom + gap;
    return { top, left };
  }

  // Centered (default)
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}

/**
 * OnboardingTour
 *
 * Props:
 *   user     — authenticated user object (must have uid)
 *   onComplete — called when tour is finished or skipped
 */
export function OnboardingTour({ user, onComplete }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const rafRef = useRef(null);

  const screen = TOUR_SEQUENCE[currentIndex];
  const isModal = screen?.type === 'intro' || screen?.type === 'transition';

  /** Measure target element position */
  const updateRect = useCallback(() => {
    if (!screen || isModal) {
      setTargetRect(null);
      return;
    }

    let selector = null;
    if (screen.placement === 'anchor-sell') {
      selector = '.hero-cta-btn-sell';
    } else if (screen.placement === 'anchor-buy') {
      selector = '.hero-cta-btn-buy';
    }

    if (selector) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
          return;
        }
      } catch {
        // Invalid selector — skip
      }
    }

    setTargetRect(null);
  }, [screen, isModal]);

  /** On step change: scroll to target element, then measure */
  useEffect(() => {
    if (!screen || isModal) {
      setTargetRect(null);
      return;
    }

    let selector = null;
    if (screen.placement === 'anchor-sell') selector = '.hero-cta-btn-sell';
    else if (screen.placement === 'anchor-buy') selector = '.hero-cta-btn-buy';

    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Measure after scroll settles
        const timer = setTimeout(() => updateRect(), 400);
        return () => clearTimeout(timer);
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => updateRect());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentIndex]);

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

  // -- Spotlight calculation --------------------------------------------------
  const showSpotlight = !isModal && targetRect && (screen.placement === 'anchor-sell' || screen.placement === 'anchor-buy');
  const spotlightStyle = showSpotlight
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : { top: -9999, left: -9999, width: 0, height: 0 };

  // -- Render -----------------------------------------------------------------

  // Collapsed state: show a floating pill to restore the tour
  if (collapsed) {
    return createPortal(
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] !text-black text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
        aria-label="Resume tour guide"
      >
        <span className="text-base">?</span>
        <span>Resume Guide — Step {screen.type === 'step' ? `${screen.partStep}/${screen.partTotal}` : '...'}</span>
      </button>,
      document.body
    );
  }

  // Collapse button used in step panels
  const collapseButton = (
    <button
      onClick={() => setCollapsed(true)}
      className="text-gray-400 text-xs hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
      aria-label="Minimize tour to make edits"
      title="Minimize — make your edits, then resume"
    >
      ▼ Minimize
    </button>
  );

  return createPortal(
    <>
      {/* Dark overlay */}
      <div className="onboarding-overlay" aria-hidden="true" />

      {/* Spotlight cutout — only for anchored steps */}
      {showSpotlight && <div className="onboarding-spotlight" style={spotlightStyle} aria-hidden="true" />}

      {/* Intro modal */}
      {screen.type === 'intro' && (
        <div
          className="onboarding-panel onboarding-panel-enter"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 400 }}
          role="dialog"
          aria-modal="true"
          aria-label="Tour introduction"
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-7 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FDB931] flex items-center justify-center mx-auto mb-5">
              <span className="text-black text-2xl font-bold">?</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-3">{screen.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{screen.description}</p>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-gray-400 text-sm underline underline-offset-2 hover:text-gray-200 transition-colors"
                disabled={saving}
              >
                Skip
              </button>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="px-5 py-3 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Start
              </button>
            </div>
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
          aria-label="Section transition"
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-7 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg mb-3">{screen.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{screen.description}</p>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-gray-400 text-sm underline underline-offset-2 hover:text-gray-200 transition-colors"
                disabled={saving}
              >
                Skip
              </button>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="px-5 py-3 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step panel */}
      {screen.type === 'step' && (
        <div
          className="onboarding-panel onboarding-panel-enter"
          style={getPanelStyle(screen.placement, targetRect)}
          role="dialog"
          aria-modal="true"
          aria-label={`Step ${screen.partStep}/${screen.partTotal}: ${screen.title}`}
        >
          <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#2A3B52] rounded-xl p-5 shadow-2xl">
            {/* Part label + step counter + minimize */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#FFD700] font-medium tracking-wide uppercase">
                Step {screen.partStep}/{screen.partTotal}
              </span>
              <div className="flex items-center gap-2">
                {/* Progress dots */}
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
                {collapseButton}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-white font-bold text-base mb-1">{screen.title}</h3>
            {screen.subtitle && (
              <p className="text-[#FFD700]/80 text-sm font-medium mb-2">{screen.subtitle}</p>
            )}
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{screen.description}</p>

            {/* Action button (e.g., "Go to Profile") — uses router.push for client-side nav so tour persists */}
            {screen.actionLabel && screen.actionPath && (
              <button
                type="button"
                onClick={() => {
                  const href = screen.actionPath === '/profile' && user?.uid ? `/profile/${user.uid}` : screen.actionPath;
                  setCollapsed(true);
                  router.push(href);
                }}
                className="inline-flex items-center gap-1.5 text-[#FFD700] text-sm font-medium hover:underline mb-4"
              >
                {screen.actionLabel} →
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-gray-400 text-sm underline underline-offset-2 hover:text-gray-200 transition-colors"
                disabled={saving}
              >
                Skip
              </button>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {screen.isLastInPart ? 'Finish' : 'Next'}
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
      aria-label="Launch guide"
      className="fixed bottom-6 left-6 z-[100] w-12 h-12 rounded-full !text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center font-bold text-xl"
    >
      ?
    </button>
  );
}

export default OnboardingTour;
