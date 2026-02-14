/**
 * InstallPrompt Component
 *
 * Prompts users to install the app as a PWA
 * Supports both Android (beforeinstallprompt) and iOS (manual instructions)
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Plus, MoreVertical, Menu } from 'lucide-react';
import './InstallPrompt.css';

// Detect iOS device
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Detect if running in standalone mode (already installed)
const isInStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Detect browser type
const detectBrowser = () => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();

  // iOS browsers
  if (isIOS()) {
    if (ua.includes('crios')) return 'chrome-ios';
    if (ua.includes('fxios')) return 'firefox-ios';
    if (ua.includes('edgios')) return 'edge-ios';
    if (ua.includes('opios')) return 'opera-ios';
    // Safari is the default on iOS
    return 'safari';
  }

  // Android/Desktop browsers
  if (ua.includes('samsung')) return 'samsung';
  if (ua.includes('opera') || ua.includes('opr')) return 'opera';
  if (ua.includes('edg')) return 'edge';
  if (ua.includes('firefox') || ua.includes('fxandroid')) return 'firefox';
  if (ua.includes('chrome')) return 'chrome';

  return 'unknown';
};

// Get browser-specific installation instructions
const getBrowserInstructions = (browser) => {
  const instructions = {
    'safari': {
      name: 'Safari',
      steps: [
        { icon: 'share', text: 'Tap the <strong>Share</strong> button at the bottom' },
        { icon: 'plus', text: 'Scroll and select <strong>Add to Home Screen</strong>' },
        { icon: 'download', text: 'Tap <strong>Add</strong> to install' },
      ],
    },
    'chrome-ios': {
      name: 'Chrome',
      steps: [
        { icon: 'share', text: 'Tap the <strong>Share</strong> button (box with arrow)' },
        { icon: 'plus', text: 'Select <strong>Add to Home Screen</strong>' },
        { icon: 'download', text: 'Tap <strong>Add</strong> to confirm' },
      ],
    },
    'firefox-ios': {
      name: 'Firefox',
      steps: [
        { icon: 'menu', text: 'Tap the <strong>Menu</strong> button (three lines)' },
        { icon: 'share', text: 'Select <strong>Share</strong>' },
        { icon: 'plus', text: 'Choose <strong>Add to Home Screen</strong>' },
      ],
    },
    'edge-ios': {
      name: 'Edge',
      steps: [
        { icon: 'menu', text: 'Tap the <strong>Menu</strong> button (three dots)' },
        { icon: 'share', text: 'Select <strong>Share</strong>' },
        { icon: 'plus', text: 'Choose <strong>Add to Home Screen</strong>' },
      ],
    },
    'chrome': {
      name: 'Chrome',
      steps: [
        { icon: 'dots', text: 'Tap the <strong>Menu</strong> (three dots) at top right' },
        { icon: 'plus', text: 'Select <strong>Add to Home screen</strong> or <strong>Install app</strong>' },
        { icon: 'download', text: 'Tap <strong>Install</strong> to confirm' },
      ],
    },
    'firefox': {
      name: 'Firefox',
      steps: [
        { icon: 'dots', text: 'Tap the <strong>Menu</strong> (three dots)' },
        { icon: 'download', text: 'Select <strong>Install</strong>' },
        { icon: 'plus', text: 'Confirm by tapping <strong>Add</strong>' },
      ],
    },
    'samsung': {
      name: 'Samsung Internet',
      steps: [
        { icon: 'menu', text: 'Tap the <strong>Menu</strong> (three lines)' },
        { icon: 'plus', text: 'Select <strong>Add page to</strong>' },
        { icon: 'download', text: 'Choose <strong>Home screen</strong>' },
      ],
    },
    'edge': {
      name: 'Edge',
      steps: [
        { icon: 'dots', text: 'Tap the <strong>Menu</strong> (three dots)' },
        { icon: 'plus', text: 'Select <strong>Add to phone</strong>' },
        { icon: 'download', text: 'Tap <strong>Install</strong>' },
      ],
    },
    'opera': {
      name: 'Opera',
      steps: [
        { icon: 'menu', text: 'Tap the <strong>Menu</strong> button' },
        { icon: 'plus', text: 'Select <strong>Home screen</strong>' },
        { icon: 'download', text: 'Tap <strong>Add</strong>' },
      ],
    },
  };

  return instructions[browser] || instructions['safari'];
};

// Icon component for steps
const StepIcon = ({ type }) => {
  switch (type) {
    case 'share':
      return <Share className="w-5 h-5 text-[#3b82f6]" />;
    case 'plus':
      return <Plus className="w-5 h-5 text-[#3b82f6]" />;
    case 'download':
      return <Download className="w-5 h-5 text-[#3b82f6]" />;
    case 'dots':
      return <MoreVertical className="w-5 h-5 text-[#3b82f6]" />;
    case 'menu':
      return <Menu className="w-5 h-5 text-[#3b82f6]" />;
    default:
      return <Download className="w-5 h-5 text-[#3b82f6]" />;
  }
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [browser, setBrowser] = useState('safari');

  useEffect(() => {
    // Check if already dismissed
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('install-prompt-dismissed');
      const dismissedAt = localStorage.getItem('install-prompt-dismissed-at');

      // Show again after 7 days
      if (wasDismissed && dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          setDismissed(true);
        }
      }

      // Check if already installed
      if (isInStandaloneMode()) {
        setIsInstalled(true);
        return;
      }

      // Check if iOS and detect browser
      const iosDevice = isIOS();
      setIsIOSDevice(iosDevice);
      setBrowser(detectBrowser());

      // On iOS, show prompt after a delay if not dismissed
      if (iosDevice && !wasDismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Only show prompt if not already dismissed
      const wasDismissed = localStorage.getItem('install-prompt-dismissed');
      const dismissedAt = localStorage.getItem('install-prompt-dismissed-at');

      if (wasDismissed && dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          // Still within dismiss period, don't show
          return;
        }
      }

      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // For iOS or when no native prompt available, show manual instructions
    if (isIOSDevice || !deferredPrompt) {
      setShowInstructions(true);
      return;
    }

    // Use native install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    setShowInstructions(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
    localStorage.setItem('install-prompt-dismissed-at', Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // For non-iOS, also check if we have a prompt or showPrompt is true
  if (!isIOSDevice && (!showPrompt || !deferredPrompt)) {
    return null;
  }

  // For iOS, check showPrompt
  if (isIOSDevice && !showPrompt) {
    return null;
  }

  // Browser-specific Instructions Modal
  if (showInstructions) {
    const browserInstructions = getBrowserInstructions(browser);

    return (
      <div className="install-prompt-ios-overlay">
        <div className="install-prompt-ios-modal">
          <button
            className="install-prompt-ios-close"
            onClick={() => setShowInstructions(false)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="install-prompt-ios-header">
            <Smartphone className="w-8 h-8 text-[#3b82f6]" />
            <h3>Install CoreTradeGlobal</h3>
          </div>
          <p className="install-prompt-ios-subtitle">
            Add this app to your home screen for quick access
          </p>
          <p className="install-prompt-browser-name">
            Using {browserInstructions.name}
          </p>
          <div className="install-prompt-ios-steps">
            {browserInstructions.steps.map((step, index) => (
              <div key={index} className="install-prompt-ios-step">
                <div className="install-prompt-ios-step-number">{index + 1}</div>
                <div className="install-prompt-ios-step-content">
                  <StepIcon type={step.icon} />
                  <span dangerouslySetInnerHTML={{ __html: step.text }} />
                </div>
              </div>
            ))}
          </div>
          <button
            className="install-prompt-ios-done"
            onClick={handleDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="install-prompt-text">
          <p className="install-prompt-title">Install CoreTradeGlobal</p>
          <p className="install-prompt-description">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="install-prompt-actions">
          <button
            className="install-prompt-install"
            onClick={handleInstall}
          >
            <Download className="w-4 h-4" />
            {isIOSDevice ? 'How to Install' : 'Install'}
          </button>
          <button
            className="install-prompt-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
