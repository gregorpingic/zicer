import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameType, MatchRecord, MatchState, PackInfo, Question, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';

interface ZicerDB extends DBSchema {
  questions: { key: string; value: Question; indexes: { type: GameType; packId: string } };
  packs: { key: string; value: PackInfo };
  played: { key: string; value: { id: string; type: GameType; playedAt: number } ; indexes: { type: GameType } };
  matches: { key: string; value: MatchRecord; indexes: { finishedAt: number } };
  kv: { key: string; value: unknown };
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
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}
export async function saveSettings(s: Settings) {
  await (await db()).put('kv', s, 'settings');
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
    await packs.put({ ...pack, count: (existing?.count || 0) + added.length, importedAt: Date.now() });
  }
  await tx.done;
  return { added, duplicates };
}

export async function listPacks(): Promise<PackInfo[]> {
  return (await db()).getAll('packs');
}

export async function deletePack(packId: string) {
  const d = await db();
  const tx = d.transaction(['questions', 'packs', 'played'], 'readwrite');
  const ids = await tx.objectStore('questions').index('packId').getAllKeys(packId);
  for (const id of ids) {
    await tx.objectStore('questions').delete(id);
    await tx.objectStore('played').delete(id);
  }
  await tx.objectStore('packs').delete(packId);
  await tx.done;
}

export async function deleteQuestion(id: string) {
  const d = await db();
  const q = await d.get('questions', id);
  if (!q) return;
  await d.delete('questions', id);
  await d.delete('played', id);
  if (q.packId) {
    const p = await d.get('packs', q.packId);
    if (p) {
      if (p.count <= 1 && !p.builtin) await d.delete('packs', p.id);
      else await d.put('packs', { ...p, count: Math.max(0, p.count - 1) });
    }
  }
}

// ---------- Odigrana pitanja ----------

export async function playedIds(type: GameType): Promise<Set<string>> {
  return new Set(await (await db()).getAllKeysFromIndex('played', 'type', type));
}
export async function markPlayed(q: Question) {
  await (await db()).put('played', { id: q.id, type: q.type, playedAt: Date.now() });
}
export async function clearPlayed(type?: GameType) {
  const d = await db();
  if (!type) return d.clear('played');
  const tx = d.transaction('played', 'readwrite');
  for (const k of await tx.store.index('type').getAllKeys(type)) await tx.store.delete(k);
  await tx.done;
}
export async function playedCount(): Promise<number> {
  return (await db()).count('played');
}

// ---------- Povijest ----------

export async function addMatchRecord(r: MatchRecord) {
  await (await db()).put('matches', r);
}
export async function listMatches(): Promise<MatchRecord[]> {
  const all = await (await db()).getAllFromIndex('matches', 'finishedAt');
  return all.reverse();
}
export async function clearMatches() {
  await (await db()).clear('matches');
}
