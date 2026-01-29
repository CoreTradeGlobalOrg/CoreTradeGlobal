/**
 * InstallPrompt Component
 *
 * Prompts users to install the app as a PWA
 * Supports both Android (beforeinstallprompt) and iOS (manual instructions)
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';
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

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

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

      // Check if iOS
      const iosDevice = isIOS();
      setIsIOSDevice(iosDevice);

      // On iOS, show prompt after a delay if not dismissed
      if (iosDevice && !wasDismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    // If this fires, app is not installed - reset dismiss state to show prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
      // Reset dismiss state since app was uninstalled
      setDismissed(false);
      localStorage.removeItem('install-prompt-dismissed');
      localStorage.removeItem('install-prompt-dismissed-at');
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
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

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
    setShowIOSInstructions(false);
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

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="install-prompt-ios-overlay">
        <div className="install-prompt-ios-modal">
          <button
            className="install-prompt-ios-close"
            onClick={() => setShowIOSInstructions(false)}
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
          <div className="install-prompt-ios-steps">
            <div className="install-prompt-ios-step">
              <div className="install-prompt-ios-step-number">1</div>
              <div className="install-prompt-ios-step-content">
                <Share className="w-5 h-5 text-[#3b82f6]" />
                <span>Tap the <strong>Share</strong> button in Safari</span>
              </div>
            </div>
            <div className="install-prompt-ios-step">
              <div className="install-prompt-ios-step-number">2</div>
              <div className="install-prompt-ios-step-content">
                <Plus className="w-5 h-5 text-[#3b82f6]" />
                <span>Select <strong>Add to Home Screen</strong></span>
              </div>
            </div>
            <div className="install-prompt-ios-step">
              <div className="install-prompt-ios-step-number">3</div>
              <div className="install-prompt-ios-step-content">
                <Download className="w-5 h-5 text-[#3b82f6]" />
                <span>Tap <strong>Add</strong> to install</span>
              </div>
            </div>
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
