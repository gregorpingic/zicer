import type { MatchRecord, Outcome, QuestionResult } from './types';

export interface CategoryStat {
  category: string;
  attempts: number;
  score: number; // točno = 1, djelomično = 0,5
}

export interface PlayerStats {
  name: string;
  matches: number;
  wins: number;
  bestScore: number;
  biggestWin: number;
  bestRound: number;
  longestStreak: number;
  correct: number;
  attempts: number;
  categories: CategoryStat[];
}

const outcomeValue = (o: Outcome) => (o === 'correct' ? 1 : o === 'partial' ? 0.5 : 0);

/** Statistika po imenu igrača, izračunata iz povijesti dvoboja (najstariji prvi). */
export function computeStats(records: MatchRecord[]): PlayerStats[] {
  const byName = new Map<string, PlayerStats & { _streak: number; _cats: Map<string, CategoryStat> }>();
  const get = (name: string) => {
    let s = byName.get(name);
    if (!s) {
      s = {
        name,
        matches: 0,
        wins: 0,
        bestScore: 0,
        biggestWin: 0,
        bestRound: 0,
        longestStreak: 0,
        correct: 0,
        attempts: 0,
        categories: [],
        _streak: 0,
        _cats: new Map(),
      };
      byName.set(name, s);
    }
    return s;
  };
  const chronological = [...records].sort((a, b) => a.finishedAt - b.finishedAt);
  for (const r of chronological) {
    r.players.forEach((name, p) => {
      const s = get(name);
      s.matches++;
      s.bestScore = Math.max(s.bestScore, r.scores[p]);
      if (r.winner === p) {
        s.wins++;
        s._streak++;
        s.longestStreak = Math.max(s.longestStreak, s._streak);
        s.biggestWin = Math.max(s.biggestWin, r.scores[p] - r.scores[1 - p]);
      } else s._streak = 0;
      const perRound = new Map<number, number>();
      for (const q of r.results) {
        perRound.set(q.roundIndex, (perRound.get(q.roundIndex) || 0) + q.points[p]);
        const o = q.outcome[p];
        if (o === null || q.skipped) continue;
        s.attempts++;
        s.correct += outcomeValue(o);
        const c = s._cats.get(q.category) || { category: q.category, attempts: 0, score: 0 };
        c.attempts++;
        c.score += outcomeValue(o);
        s._cats.set(q.category, c);
      }
      for (const v of perRound.values()) s.bestRound = Math.max(s.bestRound, v);
    });
  }
  return [...byName.values()].map(({ _streak, _cats, ...s }) => ({
    ...s,
    categories: [..._cats.values()].sort((a, b) => b.attempts - a.attempts),
  }));
}

export interface MatchSummary {
  correct: [number, number];
  attempts: [number, number];
  perRound: [number, number][];
}

export function summarizeMatch(results: QuestionResult[], rounds: number): MatchSummary {
  const correct: [number, number] = [0, 0];
  const attempts: [number, number] = [0, 0];
  const perRound: [number, number][] = Array.from({ length: rounds }, () => [0, 0]);
  for (const r of results) {
    for (const p of [0, 1] as const) {
      if (perRound[r.roundIndex]) perRound[r.roundIndex][p] += r.points[p];
      const o = r.outcome[p];
      if (o === null || r.skipped) continue;
      attempts[p]++;
      if (o === 'correct') correct[p]++;
    }
  }
  return { correct, attempts, perRound };
}
