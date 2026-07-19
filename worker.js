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
    const m = url.pathname.match(/^\/g(?:\/([\w-]{4,64}))?\/?$/);
    if (!m) return new Response('not found', { status: 404, headers: cors });
    const id = m[1];

    // Auth model: READS are public (scores are public data).
    // WRITES require a keeper key from the KEYS variable — a JSON map of
    //   { "key-string": "device-name" }, e.g.
    //   {"f1-7kq2m9x4":"field1","f2-3vp8n5t1":"field2","hub-9rw4c6z8":"hub"}
    // Each key can only write inside its own device namespace, so a leaked
    // Field 1 key can never touch Field 2's games.
    // Legacy fallback: if KEYS is not set, the old single TOKEN variable is used.
    if (req.method === 'PUT' && id) {
      let keys = null;
      try { keys = env.KEYS ? JSON.parse(env.KEYS) : null; } catch {}
      const provided = url.searchParams.get('k') || url.searchParams.get('t') || '';
      let ns = '';
      if (keys) {
        const name = keys[provided];
        if (!name) return new Response('forbidden', { status: 403, headers: cors });
        ns = String(name).replace(/[^\w-]/g, '') + ':';
      } else if (env.TOKEN) {
        if (provided !== env.TOKEN) return new Response('forbidden', { status: 403, headers: cors });
      }
      const body = await req.text();
      if (body.length > 250000) return new Response('too big', { status: 413, headers: cors });
      try { JSON.parse(body); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      const storeKey = 'g:' + ns + id;
      // cap total stored games: updates to existing slots always allowed,
      // new slots rejected past 200 (prevents storage-exhaustion abuse)
      const existing = await env.LIVE.get(storeKey);
      if (!existing) {
        const l = await env.LIVE.list({ prefix: 'g:', limit: 201 });
        if (l.keys.length >= 200) return new Response('storage full', { status: 429, headers: cors });
      }
      await env.LIVE.put(storeKey, body, { expirationTtl: 60 * 60 * 24 * 7 });
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
