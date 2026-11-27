import type { GameMode, GameType, Question, RoundKind } from './types';

export const GAME_TYPES: GameType[] = [
  'feud',
  'closest',
  'list3',
  'knowme',
  'association',
  'truefalse',
  'quiz',
  'order',
  'oddone',
  'describe',
  'higherlower',
  'category',
  'year',
  'risk',
];

export interface RoundInfo {
  name: string;
  short: string;
  /** Pravila prikazana prije početka runde. */
  rules: string[];
}

export const ROUND_INFO: Record<RoundKind, RoundInfo> = {
  feud: {
    name: 'Što kaže narod?',
    short: 'Pogodite najpopularnije odgovore s ploče.',
    rules: [
      'Igrač na potezu izgovara odgovore jedan po jedan i upisuje ih (dovoljno je nekoliko slova).',
      'Svaki pogođeni odgovor dodaje svoje bodove u banku.',
      'Nakon tri pogreške protivnik ima jedan pokušaj krađe – ako pogodi, uzima cijelu banku.',
      'Igrači se izmjenjuju na potezu od ploče do ploče.',
    ],
  },
  closest: {
    name: 'Najbliži pobjeđuje',
    short: 'Tajna brojčana procjena – bliži odgovor nosi bodove.',
    rules: [
      'Oba igrača tajno upisuju procjenu; odgovori se otkrivaju tek kad oboje odgovore.',
      'Bliži odgovor: 20 bodova. Pogodak u broj: dodatnih 10.',
      'Jednako udaljeni odgovori: oba igrača dobivaju 10.',
    ],
  },
  list3: {
    name: 'Nabroji tri',
    short: 'Usmeno nabroji tri pojma prije isteka vremena.',
    rules: [
      'Igrač na potezu naglas nabraja odgovore dok teče vrijeme.',
      'Protivnik potvrđuje koliko je odgovora bilo valjano.',
      'Svaki valjan odgovor: 10 bodova.',
    ],
  },
  knowme: {
    name: 'Koliko me poznaješ?',
    short: 'Pogodi što bi odgovorio tvoj partner.',
    rules: [
      'Jedan igrač tajno upisuje svoj odgovor, a drugi ga pokušava pogoditi naglas.',
      'Nakon otkrivanja zajedno procijenite pogodak.',
      'Točno: 20 bodova, djelomično: 10, netočno: 0 – bodove dobiva onaj koji pogađa.',
    ],
  },
  association: {
    name: 'Asocijacije',
    short: 'Tragovi se otkrivaju jedan po jedan – pronađi zajednički pojam.',
    rules: [
      'Igrač na potezu pogađa nakon svakog novog traga.',
      'Što ranije pogodiš, više bodova: 10 bodova za svaki neotkriveni trag + 10.',
      'Pogrešan odgovor otvara sljedeći trag. Ako ne pogodi ni nakon svih tragova, protivnik krade za 10 bodova.',
    ],
  },
  truefalse: {
    name: 'Istina ili laž',
    short: 'Je li tvrdnja istinita? Oba igrača odgovaraju tajno.',
    rules: ['Oba igrača tajno odgovaraju Istina ili Laž.', 'Točan odgovor: 10 bodova.', 'Nakon otkrivanja slijedi objašnjenje.'],
  },
  quiz: {
    name: 'Klasični kviz',
    short: 'Četiri ponuđena odgovora, jedan točan.',
    rules: [
      'Igrači se izmjenjuju na pitanjima.',
      'Točan odgovor: 20 bodova.',
      'Ako igrač pogriješi, protivnik može ukrasti pitanje za 10 bodova.',
    ],
  },
  order: {
    name: 'Poredaj po redu',
    short: 'Poredaj pojmove pravilnim redoslijedom.',
    rules: [
      'Igrač na potezu slaže pojmove strelicama ili povlačenjem.',
      'Sve točno: 30 bodova. Inače 5 bodova za svaki pojam na točnom mjestu.',
    ],
  },
  oddone: {
    name: 'Izbaci uljeza',
    short: 'Jedan pojam ne pripada skupini.',
    rules: ['Igrač na potezu bira uljeza.', 'Točno: 20 bodova.', 'Ako pogriješi, protivnik može ukrasti za 10 bodova.'],
  },
  describe: {
    name: 'Pogodi po opisu',
    short: 'Tragovi o osobi, filmu, životinji ili predmetu.',
    rules: [
      'Tragovi se otkrivaju od težih prema lakšima.',
      'Manje tragova znači više bodova: 10 bodova za svaki neotkriveni trag + 10.',
      'Pogrešan odgovor otvara sljedeći trag. Na kraju protivnik može ukrasti za 10 bodova.',
    ],
  },
  higherlower: {
    name: 'Veće ili manje',
    short: 'Usporedi dvije vrijednosti.',
    rules: ['Oba igrača tajno biraju odgovor.', 'Točan odgovor: 10 bodova.'],
  },
  category: {
    name: 'Kategorijski dvoboj',
    short: 'Naizmjence nabrajajte pojmove iz kategorije.',
    rules: [
      'Igrači naizmjence izgovaraju po jedan primjer iz kategorije.',
      'Ponavljanje nije dopušteno. Valjanost odgovora potvrđujete sami.',
      'Gubi onaj tko se više ne može sjetiti, ponovi odgovor ili mu istekne vrijeme. Pobjednik: 20 bodova.',
    ],
  },
  year: {
    name: 'Pogodi godinu',
    short: 'Tajno pogađanje godine – važna je preciznost.',
    rules: [
      'Oba igrača tajno upisuju godinu.',
      'Točno: 30 bodova · ±1: 25 · ±3: 20 · ±5: 15 · ±10: 10 · ±20: 5.',
    ],
  },
  risk: {
    name: 'Riskiraj bodove',
    short: 'Uloži bodove prije nego što vidiš pitanje.',
    rules: [
      'Prije pitanja svaki igrač tajno ulaže dio svojih bodova (najmanje 0, najviše sve – a ako ih ima manje od 10, može uložiti do 10).',
      'Zatim oba igrača tajno odgovaraju.',
      'Točan odgovor donosi uloženo, netočan ga oduzima.',
    ],
  },
  mix: {
    name: 'Miješana runda',
    short: 'Svako pitanje je druga vrsta igre.',
    rules: [
      'Vrsta igre mijenja se od pitanja do pitanja.',
      'Kratko pravilo prikazuje se iznad svakog pitanja.',
      'Bodovanje je kao u pojedinoj igri.',
    ],
  },
  finale: {
    name: 'Veliko finale',
    short: 'Mješavina igara uz dvostruke bodove.',
    rules: [
      'Svako pitanje je iz druge vrste igre – sve vrijedi dvostruko.',
      'Igrač koji zaostaje uvijek je prvi na potezu.',
      'Zadnje pitanje finala vrijedi trostruko – preokret je moguć do samog kraja!',
    ],
  },
};

/** Vrste koje se igraju tajnim odgovorima oba igrača (nema "igrača na potezu"). */
export const SIMULTANEOUS: GameType[] = ['closest', 'truefalse', 'higherlower', 'year', 'risk'];

/** Vrste koje nemaju smisla protiv računala (ono ne zna tvoje odgovore niti čuje izgovoreno). */
export const BOT_EXCLUDED: GameType[] = ['knowme', 'list3'];

/** Vrste koje se mogu pojaviti u finalu. */
export const FINALE_POOL: GameType[] = GAME_TYPES.filter((t) => t !== 'risk');

export interface ModeInfo {
  name: string;
  duration: string;
  rounds: number;
  questionsPerRound: number;
  finale: boolean;
}

export const MODES: Record<Exclude<GameMode, 'prilagodjeni'>, ModeInfo> = {
  brzi: { name: 'Brzi dvoboj', duration: '10–15 min', rounds: 3, questionsPerRound: 2, finale: false },
  standardni: { name: 'Standardni dvoboj', duration: '30–45 min', rounds: 6, questionsPerRound: 4, finale: true },
  veliki: { name: 'Veliki dvoboj', duration: '60–90 min', rounds: 10, questionsPerRound: 4, finale: true },
};

export const MODE_NAMES: Record<GameMode, string> = {
  brzi: 'Brzi dvoboj',
  standardni: 'Standardni dvoboj',
  veliki: 'Veliki dvoboj',
  prilagodjeni: 'Prilagođena igra',
};

export const DIFFICULTY_NAMES = { 1: 'Lako', 2: 'Srednje', 3: 'Teško' } as const;

/** Kategorija za statistiku. */
export function categoryOf(q: Question): string {
  return q.category || ROUND_INFO[q.type].name;
}

/** Tekst pitanja za prikaz u popisima i za glasovno čitanje. */
export function questionText(q: Question): string {
  switch (q.type) {
    case 'feud':
    case 'closest':
    case 'knowme':
    case 'quiz':
    case 'higherlower':
    case 'year':
    case 'risk':
      return q.question;
    case 'list3':
    case 'order':
      return q.prompt;
    case 'truefalse':
      return q.statement;
    case 'oddone':
      return q.prompt || 'Koji pojam ne pripada skupini?';
    case 'association':
      return `Asocijacija: ${q.clues[0]}…`;
    case 'describe':
      return `Pogodi: ${q.subject}`;
    case 'category':
      return q.topic;
  }
}
