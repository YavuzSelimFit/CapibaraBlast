const CACHE_NAME = 'capy-v29';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/Game.js',
    './js/Grid.js',
    './js/Renderer.js',
    './js/Input.js',
    './js/BlockFactory.js',
    './assets/bg.png',
    './assets/mascot.png',
    './assets/mascot_happy.png',
    './assets/mascot_panic.png',
    './assets/hammer.png',
    './assets/shuffle.png',
    './assets/capy_walk_sheet.png',
    './assets/capy_party_sheet.png',
    './assets/capy_panic_sheet.png',
    './assets/block_1.png',
    './assets/block_2.png',
    './assets/block_3.png'
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(
        ks.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)
    )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
