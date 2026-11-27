import type { MatchRecord, PackInfo, Question, Settings } from '../core/types';
import * as store from './db';

// Usklađivanje sa zajedničkom bazom na zicer.lastegg.app (Cloudflare D1).
// Svaki uređaj drži punu kopiju (igra radi i bez interneta), a kad je na mreži:
// - paketi: noviji pobjeđuje (lokalna promjena se šalje, novija verzija iz oblaka se preuzima),
// - povijest dvoboja i odigrana pitanja: spajaju se (unija),
// - brisanja i resetiranja šalju se i primjenjuju na svim uređajima.

const API = 'https://zicer.lastegg.app/api';

/** Postavke su iste na svim uređajima – sve, uključujući zvuk i glas. */
const SHARED_SETTINGS: (keyof Settings)[] = ['players', 'timers', 'tempo', 'difficulty', 'botName', 'botLevel', 'autoNext', 'mixed', 'sound', 'speech', 'autoSpeak', 'timer'];

export type SyncStatus = { state: 'idle' | 'syncing' | 'ok' | 'offline'; at?: number; message?: string };

let status: SyncStatus = { state: 'idle' };
const listeners = new Set<() => void>();
export function getSyncStatus() {
  return status;
}
export function onSyncChange(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}

/** Javlja ekranima da su podaci promijenjeni usklađivanjem. */
function announce() {
  window.dispatchEvent(new Event('zicer-data'));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.slice(0, 200));
  return res.json() as Promise<T>;
}

interface RemotePack {
  id: string;
  name: string;
  author: string | null;
  description: string | null;
  builtin: number;
  deleted: number;
  updated_at: number;
  count: number;
}
interface RemoteState {
  now: number;
  packs: RemotePack[];
  matches: MatchRecord[];
  played: { id: string; type: string; played_at: number }[];
  resets: Record<string, number>;
}

async function pushPack(p: PackInfo) {
  const questions = (await store.packQuestions(p.id)).map(({ packId: _p, ...q }) => q);
  const r = await call<{ updated_at: number }>(`/pack/${encodeURIComponent(p.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: p.name, author: p.author, description: p.description, builtin: !!p.builtin, questions }),
  });
  await store.putPackInfo({ ...p, count: questions.length, updatedAt: r.updated_at, syncedAt: r.updated_at });
}

async function pullPack(id: string) {
  const r = await call<RemotePack & { questions: Question[] }>(`/pack/${encodeURIComponent(id)}`);
  const info: PackInfo = {
    id: r.id,
    name: r.name,
    author: r.author ?? undefined,
    description: r.description ?? undefined,
    builtin: !!r.builtin,
    count: r.questions.length,
    importedAt: r.updated_at,
    updatedAt: r.updated_at,
    syncedAt: r.updated_at,
  };
  await store.replacePackFromRemote(info, r.questions);
}

let running: Promise<void> | null = null;
let again = false;

/** Jedan krug usklađivanja. Istodobni pozivi spajaju se u jedan dodatni krug. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncOnce();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncOnce() {
  if (!navigator.onLine) {
    setStatus({ state: 'offline', at: status.at, message: 'Nema interneta – promjene će se uskladiti kasnije.' });
    return;
  }
  setStatus({ state: 'syncing', at: status.at });
  let changed = false;
  try {
    // 1) Prvo pošalji brisanja i resetiranja napravljena na ovom uređaju.
    for (const id of await store.getPending('deletes')) {
      await call(`/pack/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await store.removePending('deletes', id);
    }
    const appliedResets = (await store.kvGet<Record<string, number>>('sync-resets')) || {};
    for (const scope of await store.getPending('resets')) {
      const r = await call<{ at: number }>('/reset', { method: 'POST', body: JSON.stringify({ scope }) });
      appliedResets[scope] = r.at;
      await store.removePending('resets', scope);
    }

    const since = (await store.kvGet<number>('sync-since')) || 0;
    const state = await call<RemoteState>(`/state?since=${since}`);

    // 2) Resetiranja s drugih uređaja.
    for (const [scope, at] of Object.entries(state.resets)) {
      if ((appliedResets[scope] || 0) >= at) continue;
      if (scope === 'matches') await store.clearMatches(at, true);
      else if (scope === 'played') await store.clearPlayed(undefined, at, true);
      else if (scope.startsWith('played:')) await store.clearPlayed(scope.slice(7) as Question['type'], at, true);
      appliedResets[scope] = at;
      changed = true;
    }
    await store.kvSet('sync-resets', appliedResets);

    // 3) Paketi.
    const remote = new Map(state.packs.map((p) => [p.id, p]));
    const local = await store.listPacks();
    for (const p of local) {
      const r = remote.get(p.id);
      const localChanged = (p.updatedAt || p.importedAt) > (p.syncedAt || 0);
      if (!r) {
        await pushPack(p);
      } else if (r.deleted) {
        if (localChanged && (p.updatedAt || 0) > r.updated_at) await pushPack(p); // ponovno uvezen nakon brisanja
        else {
          await store.deletePack(p.id, false);
          changed = true;
        }
      } else if (localChanged) {
        await pushPack(p);
      } else if (r.updated_at > (p.syncedAt || 0)) {
        await pullPack(p.id);
        changed = true;
      }
      remote.delete(p.id);
    }
    for (const r of remote.values()) {
      if (r.deleted) continue;
      await pullPack(r.id);
      changed = true;
    }

    // 4) Povijest dvoboja (unija).
    for (const m of state.matches) {
      await store.addMatchRecord(m, true);
      changed = true;
    }
    for (const m of await store.allMatchRecords()) {
      if (m.synced) continue;
      const { synced: _s, ...rec } = m;
      await call('/match', { method: 'PUT', body: JSON.stringify(rec) });
      await store.addMatchRecord(m, true);
    }

    // 5) Odigrana pitanja (unija).
    if (state.played.length) {
      await store.putPlayed(state.played.map((p) => ({ id: p.id, type: p.type as Question['type'], playedAt: p.played_at, synced: true })));
    }
    const unsent = (await store.allPlayed()).filter((p) => !p.synced);
    for (let i = 0; i < unsent.length; i += 2000) {
      const chunk = unsent.slice(i, i + 2000);
      await call('/played', { method: 'POST', body: JSON.stringify(chunk.map(({ id, type, playedAt }) => ({ id, type, playedAt }))) });
      await store.putPlayed(chunk.map((p) => ({ ...p, synced: true })));
    }

    // 6) Zajedničke postavke (zvuk i glas ostaju zasebni po uređaju).
    const localUpdated = (await store.kvGet<number>('settings-updated')) || 0;
    const localSynced = (await store.kvGet<number>('settings-synced')) || 0;
    const localSettings = await store.loadSettings();
    if (localUpdated > localSynced) {
      const shared = Object.fromEntries(SHARED_SETTINGS.map((k) => [k, localSettings[k]]));
      const r = await call<{ updated_at: number }>('/settings', { method: 'PUT', body: JSON.stringify(shared) });
      await store.kvSet('settings-synced', r.updated_at);
      await store.kvSet('settings-updated', r.updated_at);
    } else {
      const r = await call<{ value: Partial<Settings> | null; updated_at: number }>('/settings');
      if (r.value && r.updated_at > localSynced) {
        const merged = { ...localSettings };
        for (const k of SHARED_SETTINGS) if (r.value[k] !== undefined) (merged as Record<string, unknown>)[k] = r.value[k];
        await store.saveSettings(merged, true);
        await store.kvSet('settings-synced', r.updated_at);
        window.dispatchEvent(new Event('zicer-settings'));
      }
    }

    await store.kvSet('sync-since', state.now - 10_000);
    setStatus({ state: 'ok', at: Date.now() });
  } catch (e) {
    setStatus({ state: 'offline', at: status.at, message: `Usklađivanje nije uspjelo: ${(e as Error).message}` });
  }
  if (changed) announce();
}

let timer: number | undefined;
/** Pokreće usklađivanje: odmah, nakon lokalnih promjena, pri povratku u aplikaciju i svake minute. */
export function startSync() {
  // Isključivo za testiranje: localStorage 'zicer-sync' = 'off'.
  if (localStorage.getItem('zicer-sync') === 'off') return;
  store.setLocalChangeListener(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncNow(), 600);
  });
  void syncNow();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow());
  window.addEventListener('online', () => void syncNow());
  // Često, da promjena postavki ili novi paket stignu na ostale uređaje za nekoliko sekundi.
  window.setInterval(() => document.visibilityState === 'visible' && void syncNow(), 10_000);
}
