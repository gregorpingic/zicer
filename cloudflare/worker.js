// Cloudflare Worker "zicer" na domeni zicer.lastegg.app.
// 1) /api/* – zajednička baza (D1, binding DB): paketi pitanja, povijest dvoboja, odigrana pitanja.
// 2) sve ostalo – poslužuje aplikaciju objavljenu na GitHub Pages.
// Ovo je kopija koda postavljenog na Cloudflare (račun s domenom lastegg.app).

const ORIGIN = 'https://gregorpingic.github.io/zicer';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,x-zicer-pin',
};
const MAX_BODY = 6 * 1024 * 1024;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });

async function body(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw new Error('Prevelik zahtjev');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('Prevelik zahtjev');
  return JSON.parse(text);
}

async function sha(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zicer-pin-v1:' + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const okId = (s) => typeof s === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(s);

async function api(request, env, url) {
  const db = env.DB;
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const now = Date.now();
  const m = request.method;

  // ---- Kućni PIN: dok nije postavljen, baza je otvorena; nakon postavljanja traži se zaglavlje x-zicer-pin. ----
  const pinRow = await db.prepare("SELECT value FROM kv WHERE key = 'pin'").first();
  const pinOk = async (pin) => !!pinRow && typeof pin === 'string' && (await sha(pin)) === pinRow.value;
  if (parts[1] === 'pin' && m === 'GET') return json({ set: !!pinRow });
  if (pinRow) {
    const fails = await db.prepare("SELECT value, updated_at FROM kv WHERE key = 'pin-fails'").first();
    const count = fails && now - fails.updated_at < 15 * 60 * 1000 ? Number(fails.value) : 0;
    if (count >= 20) return json({ error: 'pin-locked' }, 429);
    const given = parts[1] === 'pin' && m === 'POST' ? (await body(request.clone())).old : request.headers.get('x-zicer-pin');
    if (!(await pinOk(given))) {
      // Kao pogrešan pokušaj broji se samo upisan, a krivi PIN – uređaj bez PIN-a ne smije zaključati ostale.
      if (given) await db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES ('pin-fails', ?, ?)").bind(String(count + 1), now).run();
      return json({ error: 'pin' }, 401);
    }
  }
  if (parts[1] === 'pin' && m === 'POST') {
    const b = await body(request);
    if (b.pin === null && pinRow) {
      await db.prepare("DELETE FROM kv WHERE key = 'pin'").run();
      return json({ ok: true, set: false });
    }
    if (typeof b.pin !== 'string' || !/^\d{4,8}$/.test(b.pin)) return json({ error: 'PIN mora imati 4–8 znamenki' }, 400);
    await db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES ('pin', ?, ?)").bind(await sha(b.pin), now).run();
    return json({ ok: true, set: true });
  }

  if (parts[1] === 'state' && m === 'GET') {
    const since = Number(url.searchParams.get('since') || 0);
    const [packs, matches, played, resets] = await db.batch([
      db.prepare('SELECT id, name, author, description, builtin, deleted, updated_at, count FROM packs'),
      db.prepare('SELECT data FROM matches WHERE synced_at > ?').bind(since),
      db.prepare('SELECT id, type, played_at FROM played WHERE synced_at > ?').bind(since),
      db.prepare('SELECT scope, at FROM resets'),
    ]);
    return json({
      now,
      packs: packs.results,
      matches: matches.results.map((r) => JSON.parse(r.data)),
      played: played.results,
      resets: Object.fromEntries(resets.results.map((r) => [r.scope, r.at])),
    });
  }

  if (parts[1] === 'pack' && okId(parts[2])) {
    const id = parts[2];
    if (m === 'GET') {
      const row = await db.prepare('SELECT * FROM packs WHERE id = ?').bind(id).first();
      if (!row) return json({ error: 'Nema paketa' }, 404);
      return json({ ...row, questions: JSON.parse(row.questions) });
    }
    if (m === 'PUT') {
      const b = await body(request);
      if (!Array.isArray(b.questions) || b.questions.length > 10000 || typeof b.name !== 'string') return json({ error: 'Neispravan paket' }, 400);
      await db
        .prepare(
          `INSERT INTO packs (id, name, author, description, builtin, deleted, updated_at, count, questions) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, author=excluded.author, description=excluded.description,
           builtin=excluded.builtin, deleted=0, updated_at=excluded.updated_at, count=excluded.count, questions=excluded.questions`,
        )
        .bind(id, b.name.slice(0, 200), b.author ?? null, b.description ?? null, b.builtin ? 1 : 0, now, b.questions.length, JSON.stringify(b.questions))
        .run();
      return json({ updated_at: now });
    }
    if (m === 'DELETE') {
      await db
        .prepare(
          `INSERT INTO packs (id, name, deleted, updated_at, count, questions) VALUES (?, ?, 1, ?, 0, '[]')
           ON CONFLICT(id) DO UPDATE SET deleted=1, updated_at=excluded.updated_at, count=0, questions='[]'`,
        )
        .bind(id, id, now)
        .run();
      return json({ updated_at: now });
    }
  }

  if (parts[1] === 'match' && m === 'PUT') {
    const r = await body(request);
    if (!okId(r.id) || typeof r.finishedAt !== 'number') return json({ error: 'Neispravan dvoboj' }, 400);
    await db.prepare('INSERT OR IGNORE INTO matches (id, finished_at, data, synced_at) VALUES (?, ?, ?, ?)').bind(r.id, r.finishedAt, JSON.stringify(r), now).run();
    return json({ ok: true });
  }

  if (parts[1] === 'played' && m === 'POST') {
    const list = await body(request);
    if (!Array.isArray(list) || list.length > 5000) return json({ error: 'Neispravan popis' }, 400);
    const stmt = db.prepare('INSERT OR REPLACE INTO played (id, type, played_at, synced_at) VALUES (?, ?, ?, ?)');
    const rows = list.filter((p) => okId(p.id) && typeof p.type === 'string').map((p) => stmt.bind(p.id, p.type, Number(p.playedAt) || now, now));
    for (let i = 0; i < rows.length; i += 50) await db.batch(rows.slice(i, i + 50));
    return json({ ok: true, count: rows.length });
  }

  if (parts[1] === 'reset' && m === 'POST') {
    const { scope } = await body(request);
    if (scope === 'matches') await db.prepare('DELETE FROM matches').run();
    else if (scope === 'played') await db.prepare('DELETE FROM played').run();
    else if (typeof scope === 'string' && scope.startsWith('played:')) await db.prepare('DELETE FROM played WHERE type = ?').bind(scope.slice(7)).run();
    else return json({ error: 'Nepoznato' }, 400);
    await db.prepare('INSERT OR REPLACE INTO resets (scope, at) VALUES (?, ?)').bind(scope, now).run();
    return json({ at: now });
  }

  if (parts[1] === 'settings') {
    if (m === 'GET') {
      const row = await db.prepare("SELECT value, updated_at FROM kv WHERE key = 'settings'").first();
      return json(row ? { value: JSON.parse(row.value), updated_at: row.updated_at } : { value: null, updated_at: 0 });
    }
    if (m === 'PUT') {
      const b = await body(request);
      if (!b || typeof b !== 'object') return json({ error: 'Neispravno' }, 400);
      await db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES ('settings', ?, ?)").bind(JSON.stringify(b).slice(0, 20000), now).run();
      return json({ updated_at: now });
    }
  }

  if (parts[1] === 'report' && m === 'POST') {
    const b = await body(request);
    if (!b || !okId(b.question_id)) return json({ error: 'Neispravna prijava' }, 400);
    const cnt = await db.prepare('SELECT COUNT(*) AS n FROM reports').first();
    if (cnt && cnt.n > 2000) return json({ error: 'Previše prijava' }, 429);
    await db.prepare('INSERT INTO reports (question_id, pack_id, text, reason, by_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(b.question_id, b.pack_id ?? null, String(b.text || '').slice(0, 500), String(b.reason || '').slice(0, 300), String(b.by_name || '').slice(0, 40), now).run();
    return json({ ok: true });
  }
  if (parts[1] === 'reports' && m === 'GET') {
    const r = await db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 500').all();
    return json(r.results);
  }
  if (parts[1] === 'report' && m === 'DELETE' && /^\d+$/.test(parts[2] || '')) {
    await db.prepare('DELETE FROM reports WHERE id = ?').bind(Number(parts[2])).run();
    return json({ ok: true });
  }

  if (parts[1] === 'daily') {
    if (m === 'GET') {
      const days = Math.min(60, Number(url.searchParams.get('days') || 14));
      const r = await db.prepare('SELECT date, player, score, detail, created_at FROM daily ORDER BY date DESC LIMIT ?').bind(days * 4).all();
      return json(r.results.map((x) => ({ ...x, detail: x.detail ? JSON.parse(x.detail) : null })));
    }
    if (m === 'POST') {
      const b = await body(request);
      if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || typeof b.player !== 'string' || !b.player.trim()) return json({ error: 'Neispravno' }, 400);
      await db.prepare('INSERT OR IGNORE INTO daily (date, player, score, detail, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(b.date, b.player.slice(0, 40), Math.round(Number(b.score) || 0), JSON.stringify(b.detail || null).slice(0, 20000), now).run();
      return json({ ok: true });
    }
  }

  return json({ error: 'Nepoznata putanja' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
      try {
        return await api(request, env, url);
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 500);
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
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
