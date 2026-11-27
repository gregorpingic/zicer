import type { GameType, Question, QuestionPack } from './types';
import { GAME_TYPES } from './gameInfo';

// Validacija pitanja i paketa. Poruke su na hrvatskom jer ih vide igrači pri uvozu.

export const QUIZ_CATEGORIES = [
  'Povijest',
  'Geografija',
  'Filmovi i serije',
  'Glazba',
  'Znanost',
  'Životinje',
  'Hrana i piće',
  'Hrvatska',
  'Sport',
  'Tehnologija',
  'Zanimljivosti',
] as const;

const ID_RE = /^[a-z0-9][a-z0-9._-]{2,79}$/i;

type Obj = Record<string, unknown>;

class VErr extends Error {}

function str(o: Obj, key: string, required = true): string | undefined {
  const v = o[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new VErr(`nedostaje polje "${key}"`);
    return undefined;
  }
  if (typeof v !== 'string' || !v.trim()) throw new VErr(`polje "${key}" mora biti neprazan tekst`);
  return v.trim();
}

function num(o: Obj, key: string, opts: { int?: boolean; min?: number; max?: number } = {}): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new VErr(`polje "${key}" mora biti broj`);
  if (opts.int && !Number.isInteger(v)) throw new VErr(`polje "${key}" mora biti cijeli broj`);
  if (opts.min !== undefined && v < opts.min) throw new VErr(`polje "${key}" mora biti barem ${opts.min}`);
  if (opts.max !== undefined && v > opts.max) throw new VErr(`polje "${key}" smije biti najviše ${opts.max}`);
  return v;
}

function strArr(o: Obj, key: string, min: number, max: number, required = true): string[] | undefined {
  const v = o[key];
  if (v === undefined) {
    if (required) throw new VErr(`nedostaje polje "${key}"`);
    return undefined;
  }
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x.trim()))
    throw new VErr(`polje "${key}" mora biti popis tekstova`);
  if (v.length < min || v.length > max) throw new VErr(`polje "${key}" mora imati ${min}–${max} stavki`);
  const trimmed = (v as string[]).map((s) => s.trim());
  const lower = trimmed.map((s) => s.toLowerCase());
  if (new Set(lower).size !== lower.length) throw new VErr(`polje "${key}" sadrži ponovljene stavke`);
  return trimmed;
}

function requireFactual(o: Obj) {
  str(o, 'source');
  str(o, 'explanation');
}

/** Provjerava jedno pitanje i vraća očišćenu kopiju. Baca grešku s opisom problema. */
export function validateQuestion(raw: unknown): Question {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new VErr('pitanje mora biti objekt');
  const o = raw as Obj;
  const id = str(o, 'id')!;
  if (!ID_RE.test(id))
    throw new VErr('ID smije sadržavati samo slova bez dijakritika, brojke, točku, crticu i podvlaku (3–80 znakova)');
  const type = str(o, 'type') as GameType;
  if (!GAME_TYPES.includes(type)) throw new VErr(`nepoznata vrsta "${type}"`);

  const base: Obj = { id, type };
  if (o.difficulty !== undefined) base.difficulty = num(o, 'difficulty', { int: true, min: 1, max: 3 });
  for (const k of ['category', 'source', 'explanation']) {
    const s = str(o, k, false);
    if (s) base[k] = s;
  }

  switch (type) {
    case 'feud': {
      const answers = o.answers;
      if (!Array.isArray(answers) || answers.length < 3 || answers.length > 8)
        throw new VErr('polje "answers" mora imati 3–8 odgovora');
      const clean = answers.map((a, i) => {
        if (!a || typeof a !== 'object') throw new VErr(`odgovor ${i + 1} mora biti objekt`);
        const ao = a as Obj;
        const out: Obj = { text: str(ao, 'text')!, points: num(ao, 'points', { int: true, min: 1, max: 100 }) };
        const acc = strArr(ao, 'accept', 0, 20, false);
        if (acc) out.accept = acc;
        return out;
      });
      const pts = clean.map((a) => a.points as number);
      for (let i = 1; i < pts.length; i++)
        if (pts[i] > pts[i - 1]) throw new VErr('odgovori moraju biti poredani od najviše prema najmanje bodova');
      if (typeof o.estimated !== 'boolean')
        throw new VErr('polje "estimated" mora biti true (procjena) ili false (stvarna anketa)');
      if (o.estimated === false && !base.source)
        throw new VErr('za stvarnu anketu (estimated: false) obavezno je polje "source"');
      return { ...base, question: str(o, 'question')!, answers: clean, estimated: o.estimated } as Question;
    }
    case 'closest':
      requireFactual(o);
      return { ...base, question: str(o, 'question')!, answer: num(o, 'answer'), ...(str(o, 'unit', false) ? { unit: str(o, 'unit') } : {}) } as Question;
    case 'list3': {
      const out: Obj = { ...base, prompt: str(o, 'prompt')! };
      if (o.count !== undefined) out.count = num(o, 'count', { int: true, min: 1, max: 10 });
      const ex = strArr(o, 'examples', 0, 30, false);
      if (ex) out.examples = ex;
      return out as unknown as Question;
    }
    case 'knowme': {
      const about = str(o, 'about', false);
      const answer = str(o, 'answer', false);
      return { ...base, question: str(o, 'question')!, ...(about ? { about } : {}), ...(answer ? { answer } : {}) } as Question;
    }
    case 'association':
    case 'describe': {
      const out: Obj = { ...base, clues: strArr(o, 'clues', 3, 8)!, answer: str(o, 'answer')! };
      const acc = strArr(o, 'accept', 0, 20, false);
      if (acc) out.accept = acc;
      if (type === 'describe') out.subject = str(o, 'subject')!;
      return out as unknown as Question;
    }
    case 'truefalse':
      requireFactual(o);
      if (typeof o.answer !== 'boolean') throw new VErr('polje "answer" mora biti true ili false');
      return { ...base, statement: str(o, 'statement')!, answer: o.answer } as Question;
    case 'quiz':
    case 'risk': {
      requireFactual(o);
      const options = strArr(o, 'options', 4, 4)!;
      const correct = num(o, 'correct', { int: true, min: 0, max: 3 });
      const category = str(o, 'category')!;
      if (type === 'quiz' && !(QUIZ_CATEGORIES as readonly string[]).includes(category))
        throw new VErr(`kategorija mora biti jedna od: ${QUIZ_CATEGORIES.join(', ')}`);
      return { ...base, category, question: str(o, 'question')!, options, correct } as Question;
    }
    case 'order': {
      requireFactual(o);
      const items = strArr(o, 'items', 3, 6)!;
      const values = strArr(o, 'values', items.length, items.length, false);
      if (o.values !== undefined && !values) throw new VErr('polje "values" mora imati jednako stavki kao "items"');
      return { ...base, prompt: str(o, 'prompt')!, items, ...(values ? { values } : {}) } as Question;
    }
    case 'oddone': {
      str(o, 'explanation');
      const items = strArr(o, 'items', 4, 5)!;
      const odd = num(o, 'odd', { int: true, min: 0, max: items.length - 1 });
      const prompt = str(o, 'prompt', false);
      return { ...base, items, odd, ...(prompt ? { prompt } : {}) } as Question;
    }
    case 'higherlower': {
      requireFactual(o);
      const options = strArr(o, 'options', 2, 2)! as [string, string];
      const correct = num(o, 'correct', { int: true, min: 0, max: 1 }) as 0 | 1;
      return { ...base, question: str(o, 'question')!, options, correct } as Question;
    }
    case 'category': {
      const ex = strArr(o, 'examples', 0, 50, false);
      return { ...base, topic: str(o, 'topic')!, ...(ex ? { examples: ex } : {}) } as Question;
    }
    case 'price': {
      const answer = num(o, 'answer', { min: 0.01, max: 1_000_000_000 });
      const details = str(o, 'details', false);
      return { ...base, item: str(o, 'item')!, answer, ...(details ? { details } : {}) } as Question;
    }
    case 'picture': {
      const options = strArr(o, 'options', 4, 4)!;
      const correct = num(o, 'correct', { int: true, min: 0, max: 3 });
      const image = str(o, 'image')!;
      if (!/^(https:\/\/|slike\/)[^\s"'<>]+$/.test(image)) throw new VErr('polje "image" mora biti https adresa ili putanja „slike/…”');
      return { ...base, question: str(o, 'question')!, image, options, correct } as Question;
    }
    case 'versus': {
      if (!Array.isArray(o.pairs) || o.pairs.length < 3 || o.pairs.length > 8) throw new VErr('polje "pairs" mora imati 3–8 usporedbi');
      const pairs = (o.pairs as Obj[]).map((pr) => {
        const values = strArr(pr, 'values', 2, 2, false) as [string, string] | undefined;
        return {
          a: str(pr, 'a')!,
          b: str(pr, 'b')!,
          correct: num(pr, 'correct', { int: true, min: 0, max: 1 }) as 0 | 1,
          ...(values ? { values } : {}),
        };
      });
      return { ...base, prompt: str(o, 'prompt')!, pairs } as Question;
    }
    case 'year':
      requireFactual(o);
      return { ...base, question: str(o, 'question')!, answer: num(o, 'answer', { int: true, min: -5000, max: 2100 }) } as Question;
  }
}

export interface PackParseResult {
  pack: QuestionPack['pack'];
  valid: Question[];
  invalid: { index: number; id?: string; error: string }[];
}

/** Parsira cijeli paket. Neispravna pitanja i duplikati unutar paketa idu u `invalid`. */
export function parsePack(input: string | unknown): PackParseResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (e) {
      throw new Error(`Datoteka nije ispravan JSON: ${(e as Error).message}`);
    }
  }
  if (!data || typeof data !== 'object') throw new Error('Paket mora biti JSON objekt.');
  const d = data as Obj;
  if (d.format !== 'zicer-paket') throw new Error('Nedostaje "format": "zicer-paket".');
  if (d.version !== 1) throw new Error('Podržana je samo verzija paketa 1 ("version": 1).');
  const p = d.pack as Obj | undefined;
  if (!p || typeof p !== 'object') throw new Error('Nedostaje objekt "pack" s poljima "id" i "name".');
  let pack: QuestionPack['pack'];
  try {
    const id = str(p, 'id')!;
    if (!ID_RE.test(id)) throw new VErr('ID paketa smije sadržavati samo slova bez dijakritika, brojke, točku, crticu i podvlaku');
    pack = { id, name: str(p, 'name')!, author: str(p, 'author', false), description: str(p, 'description', false) };
  } catch (e) {
    throw new Error(`Neispravan "pack": ${(e as Error).message}`);
  }
  if (!Array.isArray(d.questions)) throw new Error('Nedostaje popis "questions".');

  const valid: Question[] = [];
  const invalid: PackParseResult['invalid'] = [];
  const seen = new Set<string>();
  d.questions.forEach((q, index) => {
    const id = q && typeof q === 'object' && typeof (q as Obj).id === 'string' ? ((q as Obj).id as string) : undefined;
    try {
      const clean = validateQuestion(q);
      if (seen.has(clean.id)) throw new VErr('ID se ponavlja unutar paketa');
      seen.add(clean.id);
      valid.push({ ...clean, packId: pack.id });
    } catch (e) {
      if (!(e instanceof VErr)) throw e;
      invalid.push({ index, id, error: e.message });
    }
  });
  return { pack, valid, invalid };
}
