// Čiste funkcije bodovanja i usporedbe odgovora – bez ovisnosti o sučelju.

export const POINTS = {
  closestWin: 20,
  closestExactBonus: 10,
  closestTie: 10,
  list3PerItem: 10,
  knowmeCorrect: 20,
  knowmePartial: 10,
  steal: 10,
  truefalse: 10,
  quiz: 20,
  orderAll: 30,
  orderPerItem: 5,
  oddone: 20,
  higherlower: 10,
  categoryWin: 20,
  tiebreak: 10,
  riskMinStake: 10,
} as const;

/** Bodovi za "Najbliži pobjeđuje". */
export function closestPoints(guesses: [number, number], answer: number): [number, number] {
  const d0 = Math.abs(guesses[0] - answer);
  const d1 = Math.abs(guesses[1] - answer);
  const bonus = (d: number) => (d === 0 ? POINTS.closestExactBonus : 0);
  if (d0 === d1) return [POINTS.closestTie + bonus(d0), POINTS.closestTie + bonus(d1)];
  return d0 < d1 ? [POINTS.closestWin + bonus(d0), 0] : [0, POINTS.closestWin + bonus(d1)];
}

/** Bodovi za "Pogodi godinu" prema preciznosti. */
export function yearPoints(guess: number, answer: number): number {
  const d = Math.abs(guess - answer);
  if (d === 0) return 30;
  if (d <= 1) return 25;
  if (d <= 3) return 20;
  if (d <= 5) return 15;
  if (d <= 10) return 10;
  if (d <= 20) return 5;
  return 0;
}

/** Bodovi za igre s postupnim tragovima: 10 za svaki neotkriveni trag + 10. */
export function cluePoints(totalClues: number, shownClues: number): number {
  return Math.max(10, 10 * (totalClues - shownClues) + 10);
}

/** Bodovi za "Poredaj po redu". `arranged` sadrži indekse iz točnog poretka. */
export function orderPoints(arranged: number[]): { points: number; correctPositions: number } {
  const correctPositions = arranged.filter((v, i) => v === i).length;
  if (correctPositions === arranged.length) return { points: POINTS.orderAll, correctPositions };
  return { points: correctPositions * POINTS.orderPerItem, correctPositions };
}

/** Najveći dopušteni ulog u "Riskiraj bodove". */
export function maxStake(score: number): number {
  return Math.max(score, POINTS.riskMinStake);
}

// ---------- Usporedba upisanih odgovora (tolerantna na padeže i dijakritike) ----------

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(w: string): string {
  if (w.length > 6) return w.slice(0, w.length - 2);
  if (w.length > 4) return w.slice(0, w.length - 1);
  return w;
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function wordsMatch(g: string, c: string): boolean {
  if (g === c) return true;
  if (g.length < 3 || c.length < 3) return false;
  if (stem(g) === stem(c)) return true;
  if (g.length >= 4 && c.startsWith(g)) return true;
  if (c.length >= 4 && g.startsWith(c)) return true;
  if (g.length >= 5 && c.length >= 5 && lev(g, c) <= 1) return true;
  return false;
}

/** Odgovara li upisani pojam nekom od prihvatljivih odgovora? */
export function answerMatches(guess: string, candidates: string[]): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const gWords = g.split(' ').filter((w) => w.length >= 3);
  return candidates.some((cand) => {
    const c = normalize(cand);
    if (!c) return false;
    if (c === g) return true;
    const cWords = c.split(' ').filter((w) => w.length >= 3);
    if (!cWords.length || !gWords.length) return false;
    // Dovoljno je da se poklopi barem jedna značajna riječ.
    return gWords.some((gw) => cWords.some((cw) => wordsMatch(gw, cw)));
  });
}
