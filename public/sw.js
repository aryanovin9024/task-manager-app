/*
 * Service worker for the installed app.
 *
 * Deliberately conservative about what it keeps. Every page in this app is
 * rendered per-user behind a session, so no HTML is ever cached — a stale
 * dashboard, or worse one person's dashboard served to another, is a far
 * worse failure than a page that needs the network. What is cached is the
 * immutable build output, which makes launches fast, plus one offline page
 * to show when there is nothing to be done.
 */

const VERSION = 'v1';
const SHELL_CACHE = `task-manager-shell-${VERSION}`;
const ASSET_CACHE = `task-manager-assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Build output is content-hashed, so it can be trusted forever. */
function isImmutable(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Mutations are server actions: POSTs that must always reach the server.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkThenOfflinePage(request));
  }

  // Everything else — RSC payloads, anything session-shaped — is left alone.
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkThenOfflinePage(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}
