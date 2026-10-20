/**
 * UpdatePrompt.jsx — Service Worker update notification
 *
 * Listens for SW update events and shows a toast-style banner.
 * Uses the native ServiceWorker API (no vite-plugin-pwa virtual module dependency).
 */

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [dismissed, setDismissed]         = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) return;

      // SW already waiting — show prompt immediately
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        return;
      }

      // Listen for future updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
          }
        });
      });
    };

    navigator.serviceWorker.ready.then(handleUpdate);
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    // Tell the waiting SW to take control immediately
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // Reload to use the new version
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };

  if (!waitingWorker || dismissed) return null;

  return (
    <div className="fixed top-4 inset-x-4 z-50 max-w-sm mx-auto animate-slide-down"
         style={{ animationFillMode: 'both' }}>
      <div className="bg-gray-900 text-white rounded-2xl shadow-card-lg overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Update available</p>
            <p className="text-xs text-gray-400">A new version of SoilSense is ready</p>
          </div>
          <button
            onClick={handleUpdate}
            className="flex-shrink-0 px-3 py-1.5 bg-green-500 hover:bg-green-400
                       text-white text-xs font-bold rounded-lg transition-colors"
          >
            Update
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                       text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
