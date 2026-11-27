import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parsePack, validateQuestion } from './validate';
import { answerMatches, closestPoints, cluePoints, orderPoints, yearPoints } from './scoring';
import { planRounds } from './engine';
import { GAME_TYPES } from './gameInfo';
import builtin from '../data/osnovni-paket.json';

describe('paketi pitanja', () => {
  it('ugrađeni paket je u cijelosti valjan i pokriva sve vrste', () => {
    const r = parsePack(builtin);
    expect(r.invalid).toEqual([]);
    for (const t of GAME_TYPES) expect(r.valid.filter((q) => q.type === t).length).toBeGreaterThanOrEqual(2);
  });

  it('svaki primjer u public/primjeri je valjan paket', () => {
    const dir = 'public/primjeri';
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(GAME_TYPES.length + 1);
    for (const f of files) {
      const r = parsePack(readFileSync(`${dir}/${f}`, 'utf8'));
      expect(r.invalid, f).toEqual([]);
      expect(r.valid.length, f).toBeGreaterThan(0);
    }
  });

  it('ID-jevi primjera i ugrađenog paketa se ne preklapaju', () => {
    const all = parsePack(readFileSync('public/primjeri/svi-primjeri.json', 'utf8')).valid.map((q) => q.id);
    const b = new Set(parsePack(builtin).valid.map((q) => q.id));
    expect(all.filter((id) => b.has(id))).toEqual([]);
  });

  it('odbija duplikat ID-ja unutar paketa', () => {
    const q = { id: 'x-001', type: 'knowme', question: 'Pitanje?' };
    const r = parsePack({ format: 'zicer-paket', version: 1, pack: { id: 'test-paket', name: 'P' }, questions: [q, q] });
    expect(r.valid).toHaveLength(1);
    expect(r.invalid[0].error).toMatch(/ponavlja/);
  });

  it('javlja jasne greške za neispravna pitanja', () => {
    expect(() => validateQuestion({ id: 'test-q1', type: 'quiz', question: 'A?', options: ['a', 'b', 'c'], correct: 0, source: 'S', explanation: 'E', category: 'Sport' })).toThrow(/options/);
    expect(() => validateQuestion({ id: 'test-q2', type: 'truefalse', statement: 'X', answer: true })).toThrow(/source/);
    expect(() => validateQuestion({ id: 'čšž', type: 'knowme', question: 'A?' })).toThrow(/ID/);
    expect(() =>
      validateQuestion({ id: 'test-q3', type: 'feud', question: 'A?', estimated: true, answers: [{ text: 'a', points: 10 }, { text: 'b', points: 20 }, { text: 'c', points: 5 }] }),
    ).toThrow(/poredani/);
    expect(() => parsePack('{nije json')).toThrow(/JSON/);
    expect(() => parsePack({ format: 'drugo' })).toThrow(/format/);
  });
});

describe('bodovanje', () => {
  it('najbliži odgovor', () => {
    expect(closestPoints([200, 250], 206)).toEqual([20, 0]);
    expect(closestPoints([206, 250], 206)).toEqual([30, 0]);
    expect(closestPoints([200, 212], 206)).toEqual([10, 10]);
  });
  it('godina', () => {
    expect(yearPoints(1969, 1969)).toBe(30);
    expect(yearPoints(1972, 1969)).toBe(20);
    expect(yearPoints(1900, 1969)).toBe(0);
  });
  it('tragovi', () => {
    expect(cluePoints(4, 1)).toBe(40);
    expect(cluePoints(4, 4)).toBe(10);
    expect(cluePoints(5, 2)).toBe(40);
  });
  it('poredak', () => {
    expect(orderPoints([0, 1, 2, 3]).points).toBe(30);
    expect(orderPoints([0, 2, 1, 3]).points).toBe(10);
  });
});

describe('prepoznavanje odgovora', () => {
  it('tolerantno na padeže, dijakritike i sinonime', () => {
    expect(answerMatches('pizza', ['Pizza', 'pica'])).toBe(true);
    expect(answerMatches('snjegovic', ['Snjegović'])).toBe(true);
    expect(answerMatches('kauc', ['Legnu na kauč'])).toBe(true);
    expect(answerMatches('presvuče', ['Presvuku se'])).toBe(true);
    expect(answerMatches('zirafa', ['Žirafa'])).toBe(true);
    expect(answerMatches('tesla', ['Nikola Tesla'])).toBe(true);
    expect(answerMatches('mačka', ['Žirafa'])).toBe(false);
    expect(answerMatches('', ['Pizza'])).toBe(false);
  });
});

describe('planiranje rundi', () => {
  it('ne ponavlja vrstu dok ne iskoristi sve i završava finalom', () => {
    const r = planRounds(['quiz', 'feud', 'year'], 4, true);
    expect(r).toHaveLength(4);
    expect(r[3]).toBe('finale');
    expect(new Set(r.slice(0, 3)).size).toBe(3);
  });
  it('bez finala za jednu rundu', () => {
    expect(planRounds(['quiz'], 1, true)).toEqual(['quiz']);
  });
});
