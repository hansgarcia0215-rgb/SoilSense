/**
 * main.jsx — React application entry point
 */

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Mount React app
createRoot(document.getElementById('root')).render(<App />);

// ── PWA Service Worker ───────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isDev = import.meta.env.DEV;

    if (isDev) {
      // In development: unregister any cached SW to prevent blank page issues
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => {
          r.unregister();
          console.log('[PWA] Dev mode — unregistered old service worker');
        });
      });
      return;
    }

    // Production: register the Workbox service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('[PWA] Service worker registered ✓', registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60 * 1000);

        // If a new SW is waiting, it activates on next reload automatically
        // (skipWaiting is set in workbox config)
      })
      .catch(err => {
        console.warn('[PWA] SW registration failed:', err);
      });
  });
}
