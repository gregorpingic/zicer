import type {
  CurrentQuestion,
  DifficultySetting,
  GameType,
  JokerKind,
  JokerSet,
  MatchConfig,
  MatchRecord,
  MatchState,
  PlayerIndex,
  Question,
  QuestionOutcome,
  RoundKind,
} from './types';
import { BOT_EXCLUDED, FINALE_POOL, GAME_TYPES, SIMULTANEOUS, categoryOf } from './gameInfo';
import { POINTS } from './scoring';
import * as store from '../db/db';

// Pogon igre: svi prijelazi stanja vraćaju NOVO stanje (bez mutacije), tako da se
// stanje može spremiti, nastaviti ili u budućnosti sinkronizirati između dva uređaja.

export function uid(prefix = 'm'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Slaže popis rundi: vrste se ne ponavljaju dok se ne iskoriste sve odabrane.
 * Kod miješanih pitanja svaka runda je 'mix' (vrsta se bira za svako pitanje).
 */
export function planRounds(types: GameType[], count: number, withFinale: boolean, mixed = false): RoundKind[] {
  const pool = types.length ? types : GAME_TYPES;
  const finale = withFinale && count >= 2;
  const n = finale ? count - 1 : count;
  if (mixed) return [...Array.from({ length: n }, () => 'mix' as RoundKind), ...(finale ? (['finale'] as RoundKind[]) : [])];
  const out: RoundKind[] = [];
  while (out.length < n) {
    let batch = shuffle(pool);
    if (out.length && batch.length > 1 && batch[0] === out[out.length - 1]) batch = [...batch.slice(1), batch[0]];
    out.push(...batch);
  }
  const rounds: RoundKind[] = out.slice(0, n);
  if (finale) rounds.push('finale');
  return rounds;
}

const fullJokers = (): JokerSet => ({ fifty: true, double: true, steal: true });

/** Može li igrač p sada iskoristiti džoker? */
export function canUseJoker(state: MatchState, p: PlayerIndex, kind: JokerKind): boolean {
  const cur = state.current;
  if (!state.jokers?.[p][kind] || !cur || state.phase !== 'question') return false;
  const t = cur.question.type;
  if (kind === 'fifty') return (t === 'quiz' || t === 'oddone') && cur.active === p && !cur.removed;
  if (kind === 'double') return t !== 'risk' && !cur.doubled?.includes(p);
  return !SIMULTANEOUS.includes(t) && cur.active !== p;
}

/** Aktivira džoker; ako nije dopušten, vraća nepromijenjeno stanje. */
export function useJoker(state: MatchState, p: PlayerIndex, kind: JokerKind): MatchState {
  if (!canUseJoker(state, p, kind)) return state;
  const cur = { ...state.current! };
  const jokers = state.jokers!.map((j, i) => (i === p ? { ...j, [kind]: false } : j)) as [JokerSet, JokerSet];
  if (kind === 'fifty') {
    const q = cur.question as Extract<Question, { type: 'quiz' | 'oddone' }>;
    const correct = q.type === 'quiz' ? q.correct : q.odd;
    const count = q.type === 'quiz' ? q.options.length : q.items.length;
    const wrong = shuffle(Array.from({ length: count }, (_, i) => i).filter((i) => i !== correct));
    cur.removed = wrong.slice(0, 2);
  } else if (kind === 'double') {
    cur.doubled = [...(cur.doubled || []), p];
  } else {
    cur.active = p;
    cur.stolen = (cur.stolen || 0) + 1;
    cur.removed = undefined;
  }
  return { ...state, current: cur, jokers };
}

export function createMatch(players: [string, string], config: MatchConfig): MatchState {
  return {
    jokers: [fullJokers(), fullJokers()],
    id: uid(),
    startedAt: Date.now(),
    players,
    config,
    phase: 'roundIntro',
    roundIndex: 0,
    questionIndex: 0,
    current: null,
    scores: [0, 0],
    results: [],
    adjustments: [],
    usedIds: [],
    winner: null,
    tiebreaks: 0,
  };
}

const DIFF_MAP: Record<DifficultySetting, number | null> = { sve: null, lako: 1, srednje: 2, tesko: 3 };

/**
 * Bira pitanje koje još nije odigrano (ni u ovoj ni u prijašnjim sesijama).
 * Kad se baza za neku vrstu iscrpi, evidencija odigranih za tu vrstu se briše i kreće se ispočetka.
 */
export async function pickQuestion(
  type: GameType,
  difficulty: DifficultySetting,
  usedIds: string[],
  players?: [string, string],
): Promise<{ question: Question; recycled: boolean } | null> {
  let all = await store.questionsByType(type);
  if (type === 'knowme') {
    // Pitanja o osobama koje ne igraju ovaj dvoboj se preskaču.
    all = all.filter((q) => q.type !== 'knowme' || !q.about || players?.includes(q.about));
    // Pitanja o vama dolaze češće (oko 60 %), ako ih ima neodigranih.
    const playedSet = await store.playedIds(type);
    const usedSet = new Set(usedIds);
    const personal = all.filter((q) => q.type === 'knowme' && q.about && !playedSet.has(q.id) && !usedSet.has(q.id));
    if (personal.length && Math.random() < 0.6) {
      const question = personal[Math.floor(Math.random() * personal.length)];
      await store.markPlayed(question);
      return { question, recycled: false };
    }
  }
  if (!all.length) return null;
  const used = new Set(usedIds);
  let candidates = all.filter((q) => !used.has(q.id));
  if (!candidates.length) candidates = all; // sve iskorišteno u ovom dvoboju – dopuštamo ponavljanje
  const played = await store.playedIds(type);
  let fresh = candidates.filter((q) => !played.has(q.id));
  let recycled = false;
  if (!fresh.length) {
    await store.clearPlayed(type);
    fresh = candidates;
    recycled = true;
  }
  const wanted = DIFF_MAP[difficulty];
  if (wanted !== null) {
    const exact = fresh.filter((q) => (q.difficulty ?? 2) === wanted);
    if (exact.length) fresh = exact;
  }
  const question = fresh[Math.floor(Math.random() * fresh.length)];
  await store.markPlayed(question);
  return { question, recycled };
}

export function questionsInRound(state: MatchState): number {
  return state.config.questionsPerRound;
}

export function currentRound(state: MatchState): RoundKind {
  return state.config.rounds[state.roundIndex];
}

function trailing(scores: [number, number], fallback: PlayerIndex): PlayerIndex {
  if (scores[0] < scores[1]) return 0;
  if (scores[1] < scores[0]) return 1;
  return fallback;
}

async function availableTypes(candidates: GameType[]): Promise<GameType[]> {
  const counts = await store.countByType();
  return candidates.filter((t) => (counts[t] || 0) > 0);
}

/** Učitava pitanje za trenutačno mjesto u rundi. Vraća null ako za tu rundu nema pitanja. */
async function loadQuestion(state: MatchState, avoidType?: GameType): Promise<CurrentQuestion | null> {
  const round = currentRound(state);
  const qi = state.questionIndex;
  const n = questionsInRound(state);
  let type: GameType;
  let multiplier = 1;
  let active: PlayerIndex = ((state.roundIndex + qi) % 2) as PlayerIndex;
  if (round === 'finale' || round === 'mix') {
    const selected = state.config.types?.length
      ? state.config.types
      : state.config.rounds.filter((r): r is GameType => r !== 'finale' && r !== 'mix');
    let pool: GameType[];
    if (round === 'finale') {
      multiplier = qi === n - 1 ? 3 : 2;
      active = trailing(state.scores, (qi % 2) as PlayerIndex);
      pool = await availableTypes(FINALE_POOL.filter((t) => selected.includes(t)));
      if (!pool.length) pool = await availableTypes(FINALE_POOL.filter((t) => !state.config.bot || BOT_EXCLUDED.indexOf(t) < 0));
    } else {
      pool = await availableTypes(selected);
    }
    const recent = state.results.slice(-3).map((r) => r.type);
    const filtered = pool.filter((t) => !recent.includes(t) && t !== avoidType);
    const choose = filtered.length ? filtered : pool;
    if (!choose.length) return null;
    type = choose[Math.floor(Math.random() * choose.length)];
  } else {
    type = round;
  }
  const picked = await pickQuestion(type, state.config.difficulty, state.usedIds, state.players);
  if (!picked) return null;
  const pq = picked.question;
  // Pitanje o konkretnoj osobi: pogađa onaj drugi.
  if (pq.type === 'knowme' && pq.about) {
    const subject = state.players.indexOf(pq.about);
    if (subject >= 0) active = (1 - subject) as PlayerIndex;
  }
  return { question: pq, active, multiplier, recycled: picked.recycled };
}

/** Početak pitanja (nakon uvoda runde ili nakon prethodnog pitanja). */
export async function enterQuestion(state: MatchState): Promise<MatchState> {
  const current = await loadQuestion(state);
  if (!current) {
    // Nema pitanja za ovu vrstu – runda se preskače.
    return { ...state, phase: 'roundSummary', current: null };
  }
  return {
    ...state,
    phase: 'question',
    current,
    usedIds: [...state.usedIds, current.question.id],
  };
}

/** Bilježi ishod pitanja (s množiteljem) i prelazi na sljedeće pitanje ili sažetak runde. */
export async function completeQuestion(state: MatchState, result: QuestionOutcome): Promise<MatchState> {
  const cur = state.current;
  if (!cur) return state;
  const m = cur.question.type === 'risk' ? 1 : cur.multiplier;
  const points: [number, number] = [result.points[0] * m, result.points[1] * m];
  // Džoker „dupli bodovi” udvostručuje samo pozitivne bodove.
  for (const p of cur.doubled || []) if (points[p] > 0) points[p] *= 2;
  const scores: [number, number] = [state.scores[0] + points[0], state.scores[1] + points[1]];
  const next: MatchState = {
    ...state,
    scores,
    current: null,
    results: [
      ...state.results,
      {
        ...result,
        points,
        questionId: cur.question.id,
        type: cur.question.type,
        category: categoryOf(cur.question),
        roundIndex: state.roundIndex,
      },
    ],
  };
  if (state.phase === 'tiebreak') return resolveTiebreak(next);
  if (state.questionIndex + 1 < questionsInRound(state)) {
    return enterQuestion({ ...next, questionIndex: state.questionIndex + 1 });
  }
  return { ...next, phase: 'roundSummary' };
}

/** Preskače trenutačno pitanje i daje novo iste vrste (ili nastavlja dalje ako ga nema). */
export async function skipQuestion(state: MatchState): Promise<MatchState> {
  const cur = state.current;
  if (!cur) return state;
  const all = await store.questionsByType(cur.question.type);
  const used = new Set(state.usedIds);
  const hasFresh = all.some((q) => !used.has(q.id));
  const multi = currentRound(state) === 'finale' || currentRound(state) === 'mix';
  if (state.phase === 'tiebreak' || hasFresh || multi) {
    const replacement =
      state.phase === 'tiebreak'
        ? await loadTiebreakQuestion(state)
        : multi
          ? await loadQuestion(state, hasFresh ? undefined : cur.question.type)
          : await loadQuestion(state);
    if (replacement) {
      return {
        ...state,
        current: { ...replacement, active: cur.active, multiplier: cur.multiplier },
        usedIds: [...state.usedIds, replacement.question.id],
      };
    }
  }
  // Nema zamjene – pitanje se bilježi kao preskočeno bez bodova.
  return completeQuestion(state, { points: [0, 0], outcome: [null, null], note: 'Preskočeno' }).then((s) => ({
    ...s,
    results: s.results.map((r, i) => (i === s.results.length - 1 ? { ...r, skipped: true } : r)),
  }));
}

/** Nakon sažetka runde: sljedeća runda, dodatno pitanje za neriješeno ili kraj. */
export async function advanceAfterRound(state: MatchState): Promise<MatchState> {
  if (state.roundIndex + 1 < state.config.rounds.length) {
    return { ...state, phase: 'roundIntro', roundIndex: state.roundIndex + 1, questionIndex: 0, current: null };
  }
  return finishOrTiebreak(state);
}

async function loadTiebreakQuestion(state: MatchState): Promise<CurrentQuestion | null> {
  for (const t of ['closest', 'year', 'higherlower', 'truefalse'] as GameType[]) {
    const p = await pickQuestion(t, 'sve', state.usedIds);
    if (p) return { question: p.question, active: 0, multiplier: 1, recycled: p.recycled };
  }
  return null;
}

async function finishOrTiebreak(state: MatchState): Promise<MatchState> {
  if (state.scores[0] !== state.scores[1]) return finish(state);
  const q = await loadTiebreakQuestion(state);
  if (!q || state.tiebreaks >= 5) {
    // Krajnja mjera: nema pitanja za razrješenje – pobjeđuje onaj s više točnih odgovora.
    const correct = [0, 1].map((p) => state.results.filter((r) => r.outcome[p] === 'correct').length);
    return finish({ ...state }, correct[0] >= correct[1] ? 0 : 1);
  }
  return {
    ...state,
    phase: 'tiebreak',
    current: q,
    tiebreaks: state.tiebreaks + 1,
    usedIds: [...state.usedIds, q.question.id],
  };
}

async function resolveTiebreak(state: MatchState): Promise<MatchState> {
  const last = state.results[state.results.length - 1];
  const [a, b] = last.points;
  if (a === b) return finishOrTiebreak(state);
  // Pobjednik dodatnog pitanja dobiva bonus; poraženi ne gubi ništa.
  const w: PlayerIndex = a > b ? 0 : 1;
  const results = [...state.results];
  const pts: [number, number] = w === 0 ? [POINTS.tiebreak, 0] : [0, POINTS.tiebreak];
  results[results.length - 1] = { ...last, points: pts, note: 'Dodatno pitanje' };
  const scores: [number, number] = [state.scores[0] - a + pts[0], state.scores[1] - b + pts[1]];
  return finish({ ...state, results, scores });
}

function finish(state: MatchState, forced?: PlayerIndex): MatchState {
  const winner: PlayerIndex = forced ?? (state.scores[0] > state.scores[1] ? 0 : 1);
  return { ...state, phase: 'finished', current: null, winner, finishedAt: Date.now() };
}

export function adjustScore(state: MatchState, player: PlayerIndex, delta: number): MatchState {
  const scores: [number, number] = [...state.scores];
  scores[player] += delta;
  return {
    ...state,
    scores,
    adjustments: [...state.adjustments, { player, delta, at: Date.now(), roundIndex: state.roundIndex }],
  };
}

export function toRecord(state: MatchState): MatchRecord {
  return {
    id: state.id,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt || Date.now(),
    players: state.players,
    mode: state.config.mode,
    rounds: state.config.rounds,
    scores: state.scores,
    winner: state.winner ?? 0,
    results: state.results,
    adjustments: state.adjustments,
    ...(state.config.stake ? { stake: state.config.stake } : {}),
  };
}
