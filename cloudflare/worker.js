// Cloudflare Worker "zicer" na domeni zicer.lastegg.app.
// Poslužuje aplikaciju objavljenu na GitHub Pages, pa se svaka objava na GitHubu odmah vidi i ovdje.
// Ovo je kopija koda koji je postavljen na Cloudflare (račun s domenom lastegg.app).
const ORIGIN = 'https://gregorpingic.github.io/zicer';
export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const url = new URL(request.url);
    const target = ORIGIN + url.pathname + url.search;
    const res = await fetch(target, { method: request.method, redirect: 'manual', cf: { cacheTtl: 60, cacheEverything: true } });
    const headers = new Headers(res.headers);
    const loc = headers.get('location');
    if (loc) headers.set('location', loc.replace(ORIGIN, url.origin).replace('http://gregorpingic.github.io/zicer', url.origin));
    if (url.pathname.endsWith('sw.js') || url.pathname.endsWith('.html') || url.pathname === '/') headers.set('cache-control', 'no-cache');
    headers.delete('x-github-request-id');
    return new Response(res.body, { status: res.status, headers });
  },
};
