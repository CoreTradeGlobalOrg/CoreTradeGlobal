/**
 * OnboardingTour Component
 *
 * A React Portal-based overlay tour that highlights key platform features
 * for first-time users. Shows 5 role-appropriate steps with spotlight cutout.
 *
 * Usage:
 *   <OnboardingTour user={user} onComplete={() => {}} />
 *
 * Writes `onboardingTourCompleted: true` to Firestore on skip or finish.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { ROLES } from '@/core/constants/roles';
import './OnboardingTour.css';

/** Tour steps for trade company members */
const MEMBER_STEPS = [
  {
    targetSelector: 'main',
    title: 'Dashboard Overview',
    description:
      'This is your home base. Track your deals, see activity updates, and navigate the platform from here.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/marketplace"], [href*="marketplace"]',
    title: 'Browse Products',
    description:
      'Explore thousands of products from verified global suppliers. Filter by category, country, and more.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/requests"], [href*="requests"]',
    title: 'Submit an RFQ',
    description:
      'Post a Request for Quote to get competitive offers from multiple suppliers at once.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/deals"], [href*="deals"]',
    title: 'Start a Deal',
    description:
      'Negotiate, agree terms, select providers, and track your shipment — all in one deal thread.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-messages-fab], [href="/messages"]',
    title: 'Messages',
    description:
      'Chat with counterparties and providers directly. All conversations are tied to your deals.',
    placement: 'top',
  },
];

/** Tour steps for logistics and insurance providers */
const PROVIDER_STEPS = [
  {
    targetSelector: 'main',
    title: 'Dashboard Overview',
    description:
      'Your provider dashboard shows incoming quote requests, active work, and completed deals at a glance.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/provider"], [href*="/provider"]',
    title: 'Quote Requests',
    description:
      'Browse open quote requests from trade companies. Respond to the ones that match your capabilities.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/provider/quotes"], .provider-quotes-tab',
    title: 'Submit a Quote',
    description:
      'Open any request and submit your competitive quote. Include rates, terms, and supporting details.',
    placement: 'bottom',
  },
  {
    targetSelector: '[href="/provider/active"], .provider-active-tab',
    title: 'Active Shipments / Policies',
    description:
      'Track all your confirmed work here. Submit shipment updates and communicate progress to buyers.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-messages-fab], [href="/messages"]',
    title: 'Messages',
    description:
      'Stay in sync with trade companies through direct messaging linked to each quote or deal.',
    placement: 'top',
  },
];

/** Padding added around the target element for the spotlight cutout */
const SPOTLIGHT_PADDING = 8;

/**
 * Calculate the panel position based on target rect and desired placement.
 * Falls back to 'bottom' if placement would overflow viewport.
 */
function getPanelStyle(targetRect, placement, panelWidth = 320, panelHeight = 200) {
  if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  const centerX = targetRect.left + targetRect.width / 2;
  let left = centerX - panelWidth / 2;
  // Clamp horizontally
  left = Math.max(12, Math.min(left, vw - panelWidth - 12));

  if (placement === 'bottom') {
    const top = targetRect.bottom + gap;
    if (top + panelHeight < vh) return { top, left };
    // Would overflow bottom — try top
    const topAlt = targetRect.top - gap - panelHeight;
    if (topAlt > 0) return { top: topAlt, left };
  }

  if (placement === 'top') {
    const top = targetRect.top - gap - panelHeight;
    if (top > 0) return { top, left };
    // Fallback to bottom
    return { top: targetRect.bottom + gap, left };
  }

  if (placement === 'right') {
    const panelLeft = targetRect.right + gap;
    if (panelLeft + panelWidth < vw) {
      const top = Math.max(12, Math.min(targetRect.top, vh - panelHeight - 12));
      return { top, left: panelLeft };
    }
  }

  if (placement === 'left') {
    const panelLeft = targetRect.left - gap - panelWidth;
    if (panelLeft > 0) {
      const top = Math.max(12, Math.min(targetRect.top, vh - panelHeight - 12));
      return { top, left: panelLeft };
    }
  }

  // Default: center of screen
  return {
    top: Math.max(12, targetRect.bottom + gap),
    left,
  };
}

export function OnboardingTour({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const rafRef = useRef(null);

  const steps =
    user?.role === ROLES.LOGISTICS_PROVIDER || user?.role === ROLES.INSURANCE_PROVIDER
      ? PROVIDER_STEPS
      : MEMBER_STEPS;

  const step = steps[currentStep];

  /** Find target element and update spotlight rect */
  const updateRect = useCallback(() => {
    if (!step) return;
    const selectors = step.targetSelector.split(',').map((s) => s.trim());
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
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // No target found — use a centered rect so the panel still shows
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setTargetRect(new DOMRect(vw / 2 - 60, vh / 2 - 30, 120, 60));
    }
  }, [step]);

  // After each step change, defer rect calculation to after paint
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      updateRect();
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect, currentStep]);

  // Update rect on resize/scroll
  useEffect(() => {
    const handleUpdate = () => updateRect();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [updateRect]);

  // Ensure we only render portal on client
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
      // Non-blocking — user still exits the tour
      console.error('OnboardingTour: failed to write completion flag', err);
    } finally {
      setSaving(false);
      onComplete?.();
    }
  }, [user?.uid, onComplete, saving]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Final step
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!mounted || !step) return null;

  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : { top: -9999, left: -9999, width: 0, height: 0 };

  const panelPos = getPanelStyle(targetRect, step.placement);

  const isLastStep = currentStep === steps.length - 1;

  return createPortal(
    <>
      {/* Dark overlay — pointer-events none so spotlight target is still interactable if needed */}
      <div className="onboarding-overlay" aria-hidden="true" />

      {/* Spotlight cutout */}
      <div className="onboarding-spotlight" style={spotlightStyle} aria-hidden="true" />

      {/* Step panel */}
      <div
        className="onboarding-panel onboarding-panel-enter"
        style={panelPos}
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding step ${currentStep + 1} of ${steps.length}: ${step.title}`}
      >
        <div className="bg-[#1A283B]/95 backdrop-blur-md border border-[#2A3B52] rounded-xl p-5 shadow-2xl">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#FFD700] font-medium tracking-wide uppercase">
              Step {currentStep + 1} of {steps.length}
            </span>
            {/* Progress dots */}
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-4 bg-[#FFD700]'
                      : i < currentStep
                      ? 'w-1.5 bg-[#FFD700]/50'
                      : 'w-1.5 bg-[#2A3B52]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">{step.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="text-gray-400 text-sm underline underline-offset-2 hover:text-gray-200 transition-colors"
              disabled={saving}
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-black bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default OnboardingTour;
