/**
 * InstallPrompt.jsx — "Add to Home Screen" install banner
 *
 * Shows a native-looking install prompt when the browser fires
 * the beforeinstallprompt event (Chrome, Edge, Android).
 * On iOS Safari it shows manual instructions since iOS doesn't
 * support the install event.
 */

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow]                     = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  useEffect(() => {
    // Check if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed this before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    const safariOnly = /safari/.test(ua) && !/chrome/.test(ua);
    if (iosDevice && safariOnly) {
      setIsIOS(true);
      // Show iOS instructions after a short delay
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Chrome / Edge — listen for install event
    const handler = (e) => {
      e.preventDefault();          // Stop auto-prompt
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2000);  // Show after 2s
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!show || isInstalled) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 p-4 pb-safe animate-slide-in-left"
      style={{ animationFillMode: 'both' }}
    >
      <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-card-lg border border-gray-100
                      overflow-hidden">
        {/* Green accent top bar */}
        <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-600" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* App icon */}
              <img
                src="/icons/icon-192x192.png"
                alt="SoilSense"
                className="w-12 h-12 rounded-2xl object-contain flex-shrink-0 shadow-sm"
              />
              <div>
                <p className="font-black text-gray-900 text-base leading-tight">SoilSense</p>
                <p className="text-xs text-gray-500">Roxas, Oriental Mindoro</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full
                         text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message */}
          {isIOS ? (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-gray-900">
                Add SoilSense to your Home Screen
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Install SoilSense for quick access to soil assessment, even with limited connectivity.
              </p>
              <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Share className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span><strong>1.</strong> Tap the <strong>Share</strong> button at the bottom of Safari</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-xs">
                    ＋
                  </div>
                  <span><strong>2.</strong> Tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span><strong>3.</strong> Tap <strong>"Add"</strong> — done!</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Install SoilSense on your phone
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Get quick access to soil assessment and crop recommendations.
                Works with limited internet connectivity.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!isIOS && (
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl border border-gray-200
                           text-sm text-gray-500 font-semibold
                           hover:bg-gray-50 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl
                           text-sm text-white font-bold
                           flex items-center justify-center gap-1.5
                           transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            </div>
          )}

          {isIOS && (
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl border border-gray-200
                         text-sm text-gray-500 font-semibold
                         hover:bg-gray-50 transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
