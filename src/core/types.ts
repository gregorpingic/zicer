// Središnji tipovi aplikacije. Sve što se sprema u IndexedDB mora biti serijalizabilno (JSON),
// kako bi se igra mogla nastaviti i kasnije sinkronizirati između dva uređaja.

export type GameType =
  | 'feud'
  | 'closest'
  | 'list3'
  | 'knowme'
  | 'association'
  | 'truefalse'
  | 'quiz'
  | 'order'
  | 'oddone'
  | 'describe'
  | 'higherlower'
  | 'category'
  | 'year'
  | 'risk';

/** Runda može biti jedna vrsta igre ili Veliko finale (kombinacija vrsta). */
export type RoundKind = GameType | 'finale' | 'mix';

export type Difficulty = 1 | 2 | 3;
export type PlayerIndex = 0 | 1;

export interface BaseQuestion {
  /** Jedinstveni ID – koristi se za odbijanje duplikata i pamćenje odigranih pitanja. */
  id: string;
  type: GameType;
  /** 1 = lako, 2 = srednje, 3 = teško */
  difficulty?: Difficulty;
  /** Kategorija za statistiku (npr. "Geografija"). */
  category?: string;
  /** Izvor činjenice (obavezan kod činjeničnih pitanja). */
  source?: string;
  /** Kratko objašnjenje prikazano nakon otkrivanja. */
  explanation?: string;
  /** Postavlja aplikacija pri uvozu: iz kojeg paketa pitanje dolazi. */
  packId?: string;
}

export interface FeudQuestion extends BaseQuestion {
  type: 'feud';
  question: string;
  answers: { text: string; points: number; accept?: string[] }[];
  /** true = procijenjeni popularni odgovori (nije stvarna anketa). */
  estimated: boolean;
}
export interface ClosestQuestion extends BaseQuestion {
  type: 'closest';
  question: string;
  answer: number;
  unit?: string;
}
export interface List3Question extends BaseQuestion {
  type: 'list3';
  prompt: string;
  count?: number;
  examples?: string[];
}
export interface KnowMeQuestion extends BaseQuestion {
  type: 'knowme';
  question: string;
}
export interface AssociationQuestion extends BaseQuestion {
  type: 'association';
  clues: string[];
  answer: string;
  accept?: string[];
}
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'truefalse';
  statement: string;
  answer: boolean;
}
export interface QuizQuestion extends BaseQuestion {
  type: 'quiz';
  question: string;
  options: string[];
  correct: number;
}
export interface OrderQuestion extends BaseQuestion {
  type: 'order';
  prompt: string;
  /** Pojmovi u TOČNOM redoslijedu – aplikacija ih sama promiješa. */
  items: string[];
  /** Neobavezne vrijednosti uz pojmove (npr. godine), prikazuju se nakon otkrivanja. */
  values?: string[];
}
export interface OddOneQuestion extends BaseQuestion {
  type: 'oddone';
  prompt?: string;
  items: string[];
  odd: number;
}
export interface DescribeQuestion extends BaseQuestion {
  type: 'describe';
  /** Što se pogađa: osoba, životinja, film, predmet, država, hrana… */
  subject: string;
  clues: string[];
  answer: string;
  accept?: string[];
}
export interface HigherLowerQuestion extends BaseQuestion {
  type: 'higherlower';
  question: string;
  /** Dva ponuđena odgovora, npr. ["Više", "Manje"] ili ["Prije", "Poslije"]. */
  options: [string, string];
  correct: 0 | 1;
}
export interface CategoryQuestion extends BaseQuestion {
  type: 'category';
  topic: string;
  examples?: string[];
}
export interface YearQuestion extends BaseQuestion {
  type: 'year';
  question: string;
  answer: number;
}
export interface RiskQuestion extends BaseQuestion {
  type: 'risk';
  question: string;
  options: string[];
  correct: number;
}

export type Question =
  | FeudQuestion
  | ClosestQuestion
  | List3Question
  | KnowMeQuestion
  | AssociationQuestion
  | TrueFalseQuestion
  | QuizQuestion
  | OrderQuestion
  | OddOneQuestion
  | DescribeQuestion
  | HigherLowerQuestion
  | CategoryQuestion
  | YearQuestion
  | RiskQuestion;

export type QuestionOf<T extends GameType> = Extract<Question, { type: T }>;

export interface QuestionPack {
  format: 'zicer-paket';
  version: 1;
  pack: { id: string; name: string; author?: string; description?: string };
  questions: Question[];
}

export interface PackInfo {
  id: string;
  name: string;
  author?: string;
  description?: string;
  importedAt: number;
  count: number;
  builtin?: boolean;
  /** Zadnja lokalna promjena (uvoz, brisanje pitanja, vlastito pitanje). */
  updatedAt?: number;
  /** Verzija iz oblaka s kojom je paket zadnji put usklađen. */
  syncedAt?: number;
}

/** Ishod za statistiku: null = igrač nije sudjelovao u tom pitanju. */
export type Outcome = 'correct' | 'partial' | 'wrong' | null;

export interface QuestionOutcome {
  points: [number, number];
  outcome: [Outcome, Outcome];
  /** Kratak opis ishoda za prikaz i povijest. */
  note?: string;
}

export interface QuestionResult extends QuestionOutcome {
  questionId: string;
  type: GameType;
  category: string;
  roundIndex: number;
  skipped?: boolean;
}

export type GameMode = 'brzi' | 'standardni' | 'veliki' | 'prilagodjeni';
export type DifficultySetting = 'sve' | 'lako' | 'srednje' | 'tesko';

export type BotLevel = 'lako' | 'srednje' | 'tesko';

export interface MatchConfig {
  mode: GameMode;
  /** Igra protiv računala: računalo je uvijek igrač 2 (indeks 1). */
  bot?: BotLevel;
  /** Miješana pitanja: svako pitanje u rundi je druga vrsta igre. */
  mixed?: boolean;
  /** Odabrane vrste igara (prazno = sve). */
  types: GameType[];
  finale: boolean;
  rounds: RoundKind[];
  questionsPerRound: number;
  difficulty: DifficultySetting;
}

export interface CurrentQuestion {
  question: Question;
  active: PlayerIndex;
  multiplier: number;
  /** Poruka ako je baza za ovu vrstu iscrpljena pa se pitanja ponavljaju. */
  recycled?: boolean;
}

export type MatchPhase = 'roundIntro' | 'question' | 'roundSummary' | 'tiebreak' | 'finished';

export interface ScoreAdjustment {
  player: PlayerIndex;
  delta: number;
  at: number;
  roundIndex: number;
}

export interface MatchState {
  id: string;
  startedAt: number;
  players: [string, string];
  config: MatchConfig;
  phase: MatchPhase;
  roundIndex: number;
  questionIndex: number;
  current: CurrentQuestion | null;
  scores: [number, number];
  results: QuestionResult[];
  adjustments: ScoreAdjustment[];
  /** ID-jevi pitanja iskorištenih u ovom dvoboju. */
  usedIds: string[];
  winner: PlayerIndex | null;
  finishedAt?: number;
  tiebreaks: number;
}

export interface MatchRecord {
  id: string;
  startedAt: number;
  finishedAt: number;
  players: [string, string];
  mode: GameMode;
  rounds: RoundKind[];
  scores: [number, number];
  winner: PlayerIndex;
  results: QuestionResult[];
  adjustments: ScoreAdjustment[];
  /** Je li zapis poslan u zajedničku bazu. */
  synced?: boolean;
}

export type Tempo = 'opusteno' | 'normalno' | 'brzo' | 'bez';

/** Preporučena vremena za odgovor (sekunde) – kratko za brze odluke, dulje za razmišljanje. */
export const DEFAULT_TIMERS: Record<GameType, number> = {
  truefalse: 15,
  higherlower: 15,
  category: 20,
  association: 25,
  describe: 25,
  quiz: 30,
  oddone: 30,
  risk: 30,
  year: 30,
  feud: 30,
  closest: 40,
  list3: 60,
  order: 60,
  knowme: 60,
};

export const TEMPO_FACTOR: Record<Tempo, number> = { opusteno: 1.5, normalno: 1, brzo: 0.7, bez: 0 };

export type TimerSetting = 10 | 15 | 20 | 30 | 45 | 60 | 0; // 0 = bez ograničenja

export interface Settings {
  players: [string, string];
  sound: boolean;
  speech: boolean;
  autoSpeak: boolean;
  /** Zastarjelo (prije vremena po vrsti igre); zadržano radi starih postavki. */
  timer: TimerSetting;
  /** Vrijeme za odgovor po vrsti igre (sekunde, 0 = bez ograničenja). */
  timers: Record<GameType, number>;
  /** Tempo množi vremena: opušteno ×1,5, normalno ×1, brzo ×0,7, bez = bez ograničenja. */
  tempo: Tempo;
  difficulty: DifficultySetting;
  botName: string;
  botLevel: BotLevel;
  /** Automatski nastavak nakon otkrivanja odgovora. */
  autoNext: boolean;
  /** Miješana pitanja: svako pitanje u rundi je druga vrsta igre. */
  mixed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  players: ['Antonija', 'Ivan'],
  sound: true,
  speech: false,
  autoSpeak: false,
  timer: 30,
  timers: DEFAULT_TIMERS,
  tempo: 'normalno',
  difficulty: 'sve',
  botName: 'Robi',
  botLevel: 'srednje',
  autoNext: true,
  mixed: false,
};
