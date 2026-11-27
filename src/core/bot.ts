import type { BotLevel, PlayerIndex, Question } from './types';
import type { ControlSpec, ControlValue } from '../remote/protocol';

// Izmišljeni protivnik. Odgovara na iste kontrole kao i igrač na mobitelu,
// a odluke donosi prema točnom odgovoru i svojoj "razini znanja".

interface Skill {
  /** vjerojatnost točnog odgovora na pitanje s ponuđenim odgovorima */
  p: number;
  /** relativna pogreška procjene broja (standardna devijacija) */
  noise: number;
  /** standardna devijacija pogreške u godinama */
  years: number;
  /** vjerojatnost da pogodi asocijaciju nakon pojedinog traga */
  clue: number;
  /** vjerojatnost da se sjeti još jednog pojma u kategorijskom dvoboju */
  keepGoing: number;
  /** udio bodova koje ulaže */
  stake: [number, number];
}

const SKILLS: Record<BotLevel, Skill> = {
  lako: { p: 0.45, noise: 0.45, years: 25, clue: 0.18, keepGoing: 0.78, stake: [0.1, 0.4] },
  srednje: { p: 0.65, noise: 0.22, years: 10, clue: 0.32, keepGoing: 0.87, stake: [0.25, 0.6] },
  tesko: { p: 0.82, noise: 0.1, years: 4, clue: 0.47, keepGoing: 0.94, stake: [0.4, 0.85] },
};

export const BOT_LEVEL_NAMES: Record<BotLevel, string> = { lako: 'Lako', srednje: 'Srednje', tesko: 'Teško' };

function gauss(): number {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function roundNice(n: number): number {
  const abs = Math.abs(n);
  if (abs >= 10000) return Math.round(n / 100) * 100;
  if (abs >= 1000) return Math.round(n / 10) * 10;
  if (abs >= 20) return Math.round(n);
  return Math.round(n * 10) / 10;
}

export class BotPlayer {
  readonly player: PlayerIndex = 1;
  question: Question | null = null;
  private skill: Skill;
  private qid = '';
  private memory = new Set<string>();

  constructor(readonly level: BotLevel) {
    this.skill = SKILLS[level];
  }

  setQuestion(q: Question | null) {
    if ((q?.id ?? '') !== this.qid) {
      this.qid = q?.id ?? '';
      this.memory.clear();
    }
    this.question = q;
  }

  /** Koliko dugo "razmišlja" prije odgovora (ms). */
  delay(spec: ControlSpec): number {
    const base = spec.kind === 'text' && this.question?.type === 'category' ? 1400 : 2200;
    const t = base + Math.random() * 1800;
    return spec.timer ? Math.min(t, spec.timer * 1000 * 0.7) : t;
  }

  /** Odgovor na kontrolu; null znači da ne radi ništa. */
  decide(spec: ControlSpec): ControlValue | null {
    const q = this.question;
    const s = this.skill;
    const knows = (p = s.p) => Math.random() < p;
    if (spec.role === 'objection') return null;

    switch (spec.kind) {
      case 'buttons':
        return { button: spec.buttons[0]?.id };

      case 'choice': {
        const allowed = spec.options.map((_, i) => i).filter((i) => !spec.disabled?.includes(i));
        let correct = -1;
        if (q) {
          if (q.type === 'quiz' || q.type === 'risk' || q.type === 'higherlower') correct = q.correct;
          else if (q.type === 'oddone') correct = q.odd;
          else if (q.type === 'truefalse') correct = q.answer ? 0 : 1;
        }
        if (correct >= 0 && allowed.includes(correct) && knows()) return { choice: correct };
        const wrong = allowed.filter((i) => i !== correct);
        return { choice: pick(wrong.length ? wrong : allowed) };
      }

      case 'number': {
        if (q?.type === 'year') return { number: Math.round(q.answer + gauss() * s.years) };
        if (q?.type === 'price') {
          const guess = q.answer * Math.exp(gauss() * s.noise * 1.3);
          return { number: guess >= 100 ? roundNice(guess) : Math.round(guess * 10) / 10 };
        }
        if (q?.type === 'closest') {
          const guess = q.answer * (1 + gauss() * s.noise);
          return { number: roundNice(q.answer >= 0 ? Math.max(0, guess) : guess) };
        }
        return { number: 0 };
      }

      case 'stake': {
        const [a, b] = s.stake;
        return { number: Math.round(spec.max * (a + Math.random() * (b - a))) };
      }

      case 'order': {
        if (!q || q.type !== 'order') return { order: spec.items.map((_, i) => i) };
        // indeksi prikazanih stavki poredani prema točnom mjestu
        const ideal = spec.items
          .map((text, i) => ({ i, pos: q.items.indexOf(text) }))
          .sort((x, y) => x.pos - y.pos)
          .map((x) => x.i);
        // svaka zamjena susjednih stavki s vjerojatnošću (1 − p)
        for (let k = 0; k < ideal.length - 1; k++) {
          if (!knows(s.p + 0.1)) [ideal[k], ideal[k + 1]] = [ideal[k + 1], ideal[k]];
        }
        return { order: ideal };
      }

      case 'text': {
        const buttons = spec.buttons?.map((b) => b.id) ?? [];
        if (q?.type === 'feud') {
          const giveUp = buttons.includes('strike') ? 'strike' : 'giveup';
          if (!knows()) return { button: giveUp };
          const fresh = q.answers.filter((a) => !this.memory.has(a.text));
          if (!fresh.length) return { button: giveUp };
          // popularniji odgovori češće padaju na pamet
          const total = fresh.reduce((x, a) => x + a.points, 0);
          let r = Math.random() * total;
          const chosen = fresh.find((a) => (r -= a.points) <= 0) ?? fresh[0];
          this.memory.add(chosen.text);
          return { text: chosen.text };
        }
        if (q?.type === 'association' || q?.type === 'describe') {
          const steal = buttons.includes('giveup');
          if (knows(steal ? s.p * 0.8 : s.clue)) return { text: q.answer };
          return { button: steal ? 'giveup' : 'next' };
        }
        if (q?.type === 'list3') {
          const n = Math.round((spec.multi ?? 3) * (s.p + (Math.random() - 0.5) * 0.4));
          const pool = [...(q.examples ?? [])].sort(() => Math.random() - 0.5);
          return { text: pool.slice(0, Math.max(0, Math.min(n, pool.length))).join('\n') };
        }
        if (q?.type === 'category') {
          const fresh = (q.examples ?? []).filter((e) => !this.memory.has(e));
          if (!fresh.length || !knows(s.keepGoing)) return { button: 'dunno' };
          const e = pick(fresh);
          this.memory.add(e);
          return { text: e };
        }
        return { text: 'Ne znam' };
      }
    }
  }
}
