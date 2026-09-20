'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that makes the app installable.
 *
 * Development is deliberately excluded: the dev server rebuilds chunks under
 * the same paths the worker would cache, which breaks hot reloading in ways
 * that are hard to spot. Run a production build to exercise it.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // An unregistrable worker costs the app nothing — it still works
        // online, which is the only mode it genuinely supports.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
