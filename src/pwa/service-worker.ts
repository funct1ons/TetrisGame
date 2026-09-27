/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// Relative URL respects deployments under a subdirectory (e.g. GitHub Pages).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
// Do not skipWaiting: a new version waits until all old tabs close, never interrupting a game.
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
