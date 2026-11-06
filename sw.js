const CACHE_PREFIX = 'urbaneye-cache-';
const CACHE_VERSION = 'v19';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const LEGACY_CACHE_NAMES = ['macau-guide-v17'];
const APP_SHELL = [
  './',
  './index.html',
  './first_part.html',
  './manifest.json',
  './vendor/onnxruntime/ort.min.js',
  './vendor/onnxruntime/ort-wasm-simd-threaded.mjs',
  './vendor/onnxruntime/ort-wasm-simd-threaded.wasm',
  './vendor/tensorflow/tf.min.js',
  './vendor/tensorflow/coco-ssd.min.js',
  './vendor/tensorflow/coco-ssd/model.json',
  './vendor/tensorflow/coco-ssd/group1-shard1of5',
  './vendor/tensorflow/coco-ssd/group1-shard2of5',
  './vendor/tensorflow/coco-ssd/group1-shard3of5',
  './vendor/tensorflow/coco-ssd/group1-shard4of5',
  './vendor/tensorflow/coco-ssd/group1-shard5of5',
  './models/obstacle-yolo/yolov11best.onnx',
  './vendor/depth-anything/model_quantized.onnx'
];
const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'storage.googleapis.com',
  'tfhub.dev'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await notifyClients({ type: 'offline-status', status: 'downloading', version: CACHE_VERSION });
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      const missing = await getMissingResources(cache);
      if (missing.length) {
        throw new Error(`離線資源核對失敗：${missing.join(', ')}`);
      }
    } catch (error) {
      await notifyClients({
        type: 'offline-status',
        status: 'failed',
        version: CACHE_VERSION,
        error: error.message
      });
      throw error;
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => (key.startsWith(CACHE_PREFIX) || LEGACY_CACHE_NAMES.includes(key)) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
    const cache = await caches.open(CACHE_NAME);
    const missing = await getMissingResources(cache);
    await notifyClients({
      type: 'offline-status',
      status: missing.length ? 'failed' : 'ready',
      version: CACHE_VERSION,
      missing
    });
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !CACHEABLE_EXTERNAL_HOSTS.has(url.hostname)) return;

  const responsePromise = caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      if (response.ok || response.type === 'opaque') {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
            .catch(error => {
              console.warn('Runtime cache write failed.', error);
            })
        );
      }
      return response;
    }));
  event.respondWith(responsePromise);
});

self.addEventListener('message', event => {
  if (!['offline-status', 'repair-offline'].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.data.type === 'repair-offline') {
      await notifyClients({ type: 'offline-status', status: 'downloading', version: CACHE_VERSION });
      try {
        await cache.addAll(APP_SHELL);
      } catch (error) {
        await notifyClients({ type: 'offline-status', status: 'failed', version: CACHE_VERSION, error: error.message });
        return;
      }
    }
    const missing = await getMissingResources(cache);
    await notifyClients({
      type: 'offline-status',
      status: missing.length ? 'failed' : 'ready',
      version: CACHE_VERSION,
      missing
    });
  })());
});

async function getMissingResources(cache) {
  const missing = [];
  for (const resource of APP_SHELL) {
    const response = await cache.match(resource);
    if (!response || !response.ok) missing.push(resource);
  }
  return missing;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}
