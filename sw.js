const CACHE_NAME = 'macau-guide-v8';
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
  './models/obstacle-yolo/yolov11best.onnx'
];
const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'storage.googleapis.com',
  'tfhub.dev'
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !CACHEABLE_EXTERNAL_HOSTS.has(url.hostname)) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      if (response.ok || response.type === 'opaque') {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
