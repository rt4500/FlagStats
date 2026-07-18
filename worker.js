/* Flag Stats live relay — Cloudflare Worker
   Deploy once; bake the URL into index.html LIVE_CONFIG. Tablets need zero setup.

   Routes:
     PUT /g/:deviceId   store that device's live game state (JSON body)
     GET /g             list all devices' latest states (viewer polling)
     GET /g/:deviceId   one device's latest state

   Setup (one time, ~10 min):
   1. dash.cloudflare.com → Workers & Pages → Create Worker → paste this file.
   2. Storage & Databases → KV → create a namespace (e.g. "flagstats-live").
   3. In the Worker: Settings → Bindings → add KV binding, variable name LIVE,
      pointing at that namespace.
   4. (Recommended) Settings → Variables → add plain-text variable TOKEN with a
      random string. Put the same string in LIVE_CONFIG.token in index.html.
   5. Deploy, copy the workers.dev URL into LIVE_CONFIG.url in index.html, push.
*/
export default {
  async fetch(req, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const token = env.TOKEN || '';
    if (token && url.searchParams.get('t') !== token)
      return new Response('forbidden', { status: 403, headers: cors });

    const m = url.pathname.match(/^\/g(?:\/([\w-]{4,64}))?\/?$/);
    if (!m) return new Response('not found', { status: 404, headers: cors });
    const id = m[1];

    if (req.method === 'PUT' && id) {
      const body = await req.text();
      if (body.length > 250000) return new Response('too big', { status: 413, headers: cors });
      try { JSON.parse(body); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      await env.LIVE.put('g:' + id, body, { expirationTtl: 60 * 60 * 24 * 7 });
      return new Response('ok', { headers: cors });
    }
    if (req.method === 'GET' && id) {
      const v = await env.LIVE.get('g:' + id);
      return new Response(v || 'null', { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (req.method === 'GET') {
      // Edge-cache the list for 10 s so many spectators cost ~1 KV read burst per 10 s.
      const cache = caches.default;
      const hit = await cache.match(req);
      if (hit) return hit;
      const list = await env.LIVE.list({ prefix: 'g:' });
      const out = [];
      for (const k of list.keys) {
        const v = await env.LIVE.get(k.name);
        if (v) { try { out.push(JSON.parse(v)); } catch {} }
      }
      const resp = new Response(JSON.stringify(out), {
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=10, max-age=5' },
      });
      ctx.waitUntil(cache.put(req, resp.clone()));
      return resp;
    }
    return new Response('bad request', { status: 400, headers: cors });
  },
};
