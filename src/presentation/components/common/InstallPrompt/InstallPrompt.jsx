/**
 * InstallPrompt Component
 *
 * Prompts users to install the app as a PWA
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import './InstallPrompt.css';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    localStorage.setItem('install-prompt-dismissed', 'true');
    localStorage.setItem('install-prompt-dismissed-at', Date.now().toString());
  };

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !showPrompt || !deferredPrompt) {
    return null;
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
            Install
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
