import type { GameType, PlayerIndex, QuestionOf, QuestionOutcome } from '../core/types';

/** Sučelje koje svaka vrsta igre implementira. Nova vrsta = nova komponenta + zapis u registru. */
export interface GameProps<T extends GameType = GameType> {
  question: QuestionOf<T>;
  /** Igrač na potezu (za igre u kojima odgovara jedan igrač). */
  active: PlayerIndex;
  players: [string, string];
  scores: [number, number];
  /** Množitelj bodova (finale) – komponenta ga samo prikazuje, pogon ga primjenjuje. */
  multiplier: number;
  /** Džoker 50:50 – indeksi uklonjenih netočnih odgovora. */
  removed?: number[];
  onDone: (result: QuestionOutcome) => void;
}
