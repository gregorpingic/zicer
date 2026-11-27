import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameType, MatchRecord, MatchState, PackInfo, Question, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';

interface ZicerDB extends DBSchema {
  questions: { key: string; value: Question; indexes: { type: GameType; packId: string } };
  packs: { key: string; value: PackInfo };
  played: { key: string; value: PlayedRow; indexes: { type: GameType } };
  matches: { key: string; value: MatchRecord; indexes: { finishedAt: number } };
  kv: { key: string; value: unknown };
}

export interface PlayedRow {
  id: string;
  type: GameType;
  playedAt: number;
  synced?: boolean;
}

/** Obavijest sloju za usklađivanje da se nešto lokalno promijenilo. */
let onLocalChange: () => void = () => undefined;
export function setLocalChangeListener(l: () => void) {
  onLocalChange = l;
}

let dbPromise: Promise<IDBPDatabase<ZicerDB>> | null = null;

export function db(): Promise<IDBPDatabase<ZicerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ZicerDB>('zicer', 1, {
      upgrade(d) {
        const q = d.createObjectStore('questions', { keyPath: 'id' });
        q.createIndex('type', 'type');
        q.createIndex('packId', 'packId');
        d.createObjectStore('packs', { keyPath: 'id' });
        const p = d.createObjectStore('played', { keyPath: 'id' });
        p.createIndex('type', 'type');
        const m = d.createObjectStore('matches', { keyPath: 'id' });
        m.createIndex('finishedAt', 'finishedAt');
        d.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

// ---------- Postavke i spremljena igra ----------

export async function loadSettings(): Promise<Settings> {
  const s = (await (await db()).get('kv', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(s || {}), timers: { ...DEFAULT_SETTINGS.timers, ...(s?.timers || {}) } };
}
export async function saveSettings(s: Settings, fromRemote = false) {
  const d = await db();
  await d.put('kv', s, 'settings');
  if (!fromRemote) {
    await d.put('kv', Date.now(), 'settings-updated');
    onLocalChange();
  }
}
export async function loadSavedMatch(): Promise<MatchState | null> {
  return ((await (await db()).get('kv', 'savedMatch')) as MatchState | undefined) || null;
}
export async function saveMatch(m: MatchState | null) {
  const d = await db();
  if (m) await d.put('kv', m, 'savedMatch');
  else await d.delete('kv', 'savedMatch');
}

// ---------- Pitanja i paketi ----------

export async function allQuestions(): Promise<Question[]> {
  return (await db()).getAll('questions');
}
export async function questionsByType(type: GameType): Promise<Question[]> {
  return (await db()).getAllFromIndex('questions', 'type', type);
}
export async function countByType(): Promise<Record<string, number>> {
  const all = await allQuestions();
  const out: Record<string, number> = {};
  for (const q of all) out[q.type] = (out[q.type] || 0) + 1;
  return out;
}

export interface ImportReport {
  added: string[];
  duplicates: string[];
}

/** Sprema pitanja; ID koji već postoji u bazi odbija se kao duplikat. */
export async function addQuestions(questions: Question[], pack: PackInfo): Promise<ImportReport> {
  const d = await db();
  const tx = d.transaction(['questions', 'packs'], 'readwrite');
  const qs = tx.objectStore('questions');
  const added: string[] = [];
  const duplicates: string[] = [];
  for (const q of questions) {
    if (await qs.getKey(q.id)) duplicates.push(q.id);
    else {
      await qs.add(q);
      added.push(q.id);
    }
  }
  const packs = tx.objectStore('packs');
  const existing = await packs.get(pack.id);
  if (added.length || !existing) {
    const now = Date.now();
    await packs.put({ ...existing, ...pack, count: (existing?.count || 0) + added.length, importedAt: now, updatedAt: now, syncedAt: existing?.syncedAt });
  }
  await tx.done;
  if (added.length) onLocalChange();
  return { added, duplicates };
}

export async function listPacks(): Promise<PackInfo[]> {
  return (await db()).getAll('packs');
}

export async function packQuestions(packId: string): Promise<Question[]> {
  return (await db()).getAllFromIndex('questions', 'packId', packId);
}

/** Zamjenjuje sadržaj paketa verzijom iz oblaka (bez obavijesti o lokalnoj promjeni). */
export async function replacePackFromRemote(info: PackInfo, questions: Question[]) {
  const d = await db();
  const tx = d.transaction(['questions', 'packs'], 'readwrite');
  const qs = tx.objectStore('questions');
  for (const id of await qs.index('packId').getAllKeys(info.id)) await qs.delete(id);
  for (const q of questions) await qs.put({ ...q, packId: info.id });
  await tx.objectStore('packs').put(info);
  await tx.done;
}

export async function putPackInfo(info: PackInfo) {
  await (await db()).put('packs', info);
}

/** Briše paket lokalno; deleteRemote = false kad brisanje dolazi iz oblaka. */
export async function deletePack(packId: string, deleteRemote = true) {
  const d = await db();
  const tx = d.transaction(['questions', 'packs', 'played'], 'readwrite');
  const ids = await tx.objectStore('questions').index('packId').getAllKeys(packId);
  for (const id of ids) {
    await tx.objectStore('questions').delete(id);
    await tx.objectStore('played').delete(id);
  }
  await tx.objectStore('packs').delete(packId);
  await tx.done;
  if (deleteRemote) {
    await addPending('deletes', packId);
    onLocalChange();
  }
}

/** Radnje koje čekaju slanje u oblak (ako uređaj nije bio na mreži). */
export async function getPending(kind: 'deletes' | 'resets'): Promise<string[]> {
  return ((await (await db()).get('kv', `pending-${kind}`)) as string[] | undefined) || [];
}
export async function addPending(kind: 'deletes' | 'resets', v: string) {
  const cur = await getPending(kind);
  if (!cur.includes(v)) await (await db()).put('kv', [...cur, v], `pending-${kind}`);
}
export async function removePending(kind: 'deletes' | 'resets', v: string) {
  const cur = await getPending(kind);
  await (await db()).put('kv', cur.filter((x) => x !== v), `pending-${kind}`);
}
export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined;
}
export async function kvSet(key: string, v: unknown) {
  await (await db()).put('kv', v, key);
}

export async function deleteQuestion(id: string) {
  const d = await db();
  const q = await d.get('questions', id);
  if (!q) return;
  await d.delete('questions', id);
  await d.delete('played', id);
  if (q.packId) {
    const p = await d.get('packs', q.packId);
    if (p) await d.put('packs', { ...p, count: Math.max(0, p.count - 1), updatedAt: Date.now() });
    onLocalChange();
  }
}

// ---------- Odigrana pitanja ----------

export async function playedIds(type: GameType): Promise<Set<string>> {
  return new Set(await (await db()).getAllKeysFromIndex('played', 'type', type));
}
export async function markPlayed(q: Question) {
  await (await db()).put('played', { id: q.id, type: q.type, playedAt: Date.now() });
  onLocalChange();
}
export async function allPlayed(): Promise<PlayedRow[]> {
  return (await db()).getAll('played');
}
export async function putPlayed(rows: PlayedRow[]) {
  const d = await db();
  const tx = d.transaction('played', 'readwrite');
  for (const r of rows) await tx.store.put(r);
  await tx.done;
}
/** Briše evidenciju odigranih (local = true kad brisanje dolazi iz oblaka ili se ne treba slati). */
export async function clearPlayed(type?: GameType, before = Infinity, local = false) {
  const d = await db();
  const tx = d.transaction('played', 'readwrite');
  const rows = type ? await tx.store.index('type').getAll(type) : await tx.store.getAll();
  for (const r of rows) if (r.playedAt < before) await tx.store.delete(r.id);
  await tx.done;
  if (!local) {
    await addPending('resets', type ? `played:${type}` : 'played');
    onLocalChange();
  }
}
export async function playedCount(): Promise<number> {
  return (await db()).count('played');
}

// ---------- Povijest ----------

export async function addMatchRecord(r: MatchRecord, fromRemote = false) {
  await (await db()).put('matches', fromRemote ? { ...r, synced: true } : r);
  if (!fromRemote) onLocalChange();
}
export async function allMatchRecords(): Promise<MatchRecord[]> {
  return (await db()).getAll('matches');
}
export async function listMatches(): Promise<MatchRecord[]> {
  const all = await (await db()).getAllFromIndex('matches', 'finishedAt');
  return all.reverse();
}
export async function clearMatches(before = Infinity, local = false) {
  const d = await db();
  const tx = d.transaction('matches', 'readwrite');
  for (const r of await tx.store.getAll()) if (r.finishedAt < before) await tx.store.delete(r.id);
  await tx.done;
  if (!local) {
    await addPending('resets', 'matches');
    onLocalChange();
  }
}
