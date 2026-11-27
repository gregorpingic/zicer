import type { JokerKind, PlayerIndex } from '../core/types';

/** Stanje džokera za prikaz: 'ok' = može se iskoristiti, 'na' = nije primjenjiv sada, 'used' = potrošen. */
export type JokerView = Record<JokerKind, 'ok' | 'na' | 'used'>;

// Protokol između televizora (domaćin, vodi igru) i mobitela (upravljači).
// Televizor opisuje što koji igrač trenutačno može napraviti (ControlSpec),
// mobitel to iscrtava i vraća odabranu vrijednost (ControlValue).

export interface ControlButton {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'good' | 'bad' | 'ghost';
}

interface ControlBase {
  /** Kome se prikazuje: jednom igraču ili bilo kojem ('any' – vrijedi prvi odgovor). */
  for: PlayerIndex | 'any';
  /** Tekst iznad kontrole na mobitelu (npr. pitanje). */
  title?: string;
  /** Kratka poruka (npr. "Nema na ploči!"). */
  note?: string;
  /** Tajni unos – televizor ga nikad ne prikazuje. */
  secret?: boolean;
  /** Vrijeme za odgovor u sekundama (mobitel prikazuje odbrojavanje). */
  timer?: number;
  /** Kontekst za mobitel da ne treba gledati u televizor (tragovi, stanje ploče…). */
  lines?: string[];
  /**
   * Uloga kontrole u igri protiv računala: 'judge' – procjena tuđeg odgovora (prepušta se čovjeku),
   * 'objection' – prigovor na protivnikov odgovor (računalo ga ne koristi).
   */
  role?: 'judge' | 'objection';
}

export type ControlSpec = ControlBase &
  (
    | { kind: 'buttons'; buttons: ControlButton[] }
    | { kind: 'choice'; options: string[]; disabled?: number[]; buttons?: ControlButton[] }
    | { kind: 'number'; unit?: string; placeholder?: string }
    | { kind: 'text'; placeholder?: string; submitLabel?: string; allowEmpty?: boolean; buttons?: ControlButton[]; multi?: number }
    | { kind: 'stake'; max: number; score: number }
    | { kind: 'order'; items: string[] }
  );

export interface ControlValue {
  button?: string;
  choice?: number;
  number?: number;
  text?: string;
  order?: number[];
}

export interface PhoneInfo {
  players: [string, string];
  scores: [number, number];
  title: string;
  subtitle?: string;
  paused: boolean;
  inGame: boolean;
  /** Trenutačno pitanje i tko je na potezu (za prikaz dok mobitel čeka). */
  question?: string;
  turn?: string;
  /** Džokeri po igraču (ako su uključeni). */
  jokers?: [JokerView, JokerView];
  /** Može li se trenutačno pitanje prijaviti. */
  canReport?: boolean;
}

export type HostMessage =
  | { type: 'hello'; players: [string, string]; taken: [boolean, boolean] }
  | { type: 'joined'; player: PlayerIndex }
  | { type: 'state'; info: PhoneInfo; controls: (ControlSpec & { id: string })[] }
  | { type: 'kicked'; reason: string };

export type PhoneCommand =
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  | { cmd: 'skip' }
  | { cmd: 'adjust'; player: PlayerIndex; delta: number }
  | { cmd: 'zoom'; delta: number }
  | { cmd: 'joker'; kind: JokerKind }
  | { cmd: 'report'; reason: string };

export type PhoneMessage =
  | { type: 'join'; player: PlayerIndex }
  | { type: 'submit'; id: string; value: ControlValue }
  | ({ type: 'cmd' } & PhoneCommand);

export const PEER_PREFIX = 'zicer-dvoboj-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRoomCode(): string {
  let s = '';
  const rnd = crypto.getRandomValues(new Uint32Array(5));
  for (const n of rnd) s += ALPHABET[n % ALPHABET.length];
  return s;
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function joinUrl(code: string): string {
  return `${location.origin}${location.pathname}#mobitel=${code}`;
}
