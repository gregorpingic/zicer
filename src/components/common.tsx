import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlayerIndex, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { speak, speakOnce, speechSupported } from '../core/speech';
import { sfx } from '../core/sound';
import { Control, useControl, useRemoteHost } from '../remote/RemoteContext';
import type { ControlSpec, ControlValue } from '../remote/protocol';

/** Opis tajnog unosa za mobitel (bez polja "for", koje postavlja SecretSequence). */
export type RemoteInput =
  | { kind: 'number'; title?: string; unit?: string; placeholder?: string }
  | { kind: 'choice'; title?: string; options: string[] }
  | { kind: 'text'; title?: string; placeholder?: string; submitLabel?: string }
  | { kind: 'stake'; title?: string; max: number; score: number };

export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SettingsContext);

/** Pauza igre – komponente s mjeračem vremena je poštuju. */
export const PauseContext = createContext(false);
export const usePaused = () => useContext(PauseContext);

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  big,
  className = '',
  type = 'button',
  autoFocus,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'good' | 'bad';
  disabled?: boolean;
  big?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  autoFocus?: boolean;
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${big ? 'btn-big' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
    >
      {children}
    </button>
  );
}

/** Veliki prikaz pitanja s gumbom za glasovno čitanje. */
export function QuestionCard({ label, text, speakText, children }: { label?: ReactNode; text: string; speakText?: string; children?: ReactNode }) {
  const settings = useSettings();
  const toRead = speakText ?? text;
  useEffect(() => {
    if (settings.speech && settings.autoSpeak) speakOnce(toRead);
  }, [toRead, settings.speech, settings.autoSpeak]);
  return (
    <div className="qcard">
      {label && <div className="qcard-label">{label}</div>}
      <div className="qcard-text">{text}</div>
      {children}
      {settings.speech && speechSupported() && (
        <button className="speak-btn" onClick={() => speak(toRead)} aria-label="Pročitaj naglas" title="Pročitaj naglas">
          🔊
        </button>
      )}
    </div>
  );
}

export function PlayerTag({ p, name }: { p: PlayerIndex; name: string }) {
  return <span className={`ptag p${p}`}>{name}</span>;
}

export function TurnBanner({ p, name, children }: { p: PlayerIndex; name: string; children?: ReactNode }) {
  return (
    <div className={`turn-banner p${p}`}>
      <span className="turn-dot" /> Na potezu: <strong>{name}</strong>
      {children}
    </div>
  );
}

/** Prikaz dodijeljenih bodova na kraju pitanja. */
export function ResultBanner({
  points,
  players,
  multiplier = 1,
  title,
}: {
  points: [number, number];
  players: [string, string];
  multiplier?: number;
  title?: ReactNode;
}) {
  return (
    <div className="result-banner">
      {title && <div className="result-title">{title}</div>}
      <div className="result-points">
        {([0, 1] as const).map((p) => {
          const v = points[p] * multiplier;
          return (
            <div key={p} className={`result-p p${p} ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}`}>
              <span className="rp-name">{players[p]}</span>
              <span className="rp-val">{v > 0 ? `+${v}` : v}</span>
            </div>
          );
        })}
      </div>
      {multiplier > 1 && <div className="muted small">Bodovi ×{multiplier}</div>}
    </div>
  );
}

export function Explanation({ explanation, source }: { explanation?: string; source?: string }) {
  if (!explanation && !source) return null;
  return (
    <div className="explain">
      {explanation && <p>{explanation}</p>}
      {source && <p className="source">Izvor: {source}</p>}
    </div>
  );
}

/** Mjerač vremena koji se zaustavlja tijekom pauze. seconds = 0 znači bez ograničenja. */
export function Timer({ seconds, running, onEnd }: { seconds: number; running: boolean; onEnd: () => void }) {
  const paused = usePaused();
  const [left, setLeft] = useState(seconds * 1000);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const lastTick = useRef<number | null>(null);

  useEffect(() => setLeft(seconds * 1000), [seconds]);

  useEffect(() => {
    if (!running || paused || seconds === 0) {
      lastTick.current = null;
      return;
    }
    lastTick.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - (lastTick.current ?? now);
      lastTick.current = now;
      setLeft((prev) => {
        const next = Math.max(0, prev - dt);
        if (Math.ceil(next / 1000) !== Math.ceil(prev / 1000) && next > 0 && next <= 3000) sfx.tick();
        if (next === 0 && prev > 0) {
          sfx.timeUp();
          setTimeout(() => endRef.current(), 0);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [running, paused, seconds]);

  if (seconds === 0) return <div className="timer timer-none">Bez vremenskog ograničenja</div>;
  const s = Math.ceil(left / 1000);
  const frac = left / (seconds * 1000);
  return (
    <div className={`timer ${s <= 5 ? 'timer-low' : ''}`} role="timer" aria-live="off">
      <div className="timer-num">{s}</div>
      <div className="timer-bar">
        <div className="timer-fill" style={{ transform: `scaleX(${frac})` }} />
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Confirm({
  title,
  text,
  confirmLabel = 'Potvrdi',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="modal-text">{text}</div>
      <div className="row end">
        <Button variant="ghost" onClick={onCancel}>
          Odustani
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Parsira broj upisan na hrvatski način (1.234,5 ili 1 234 ili 1234.5). */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/\s| /g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('hr-HR', { maximumFractionDigits: 2 });
}

/**
 * Tajni unos za oba igrača na istom uređaju: prije svakog unosa slijedi zaslon za predaju uređaja,
 * a predani odgovor se više ne prikazuje dok oba igrača ne odgovore.
 */
interface SecretProps<T> {
  players: [string, string];
  order: PlayerIndex[];
  header?: ReactNode;
  renderInput: (p: PlayerIndex, submit: (v: T) => void) => ReactNode;
  onComplete: (values: Partial<Record<PlayerIndex, T>>) => void;
  /** Opis unosa za mobitel (način s mobitelima). */
  remote: (p: PlayerIndex) => RemoteInput;
  /** Pretvara odgovor s mobitela u vrijednost. */
  fromValue: (v: ControlValue, p: PlayerIndex) => T;
}

/** Tajni unos: na jednom uređaju s predajom uređaja, a s mobitelima istodobno na oba mobitela. */
export function SecretSequence<T>(props: SecretProps<T>) {
  const host = useRemoteHost();
  return host ? <RemoteSecretSequence {...props} /> : <LocalSecretSequence {...props} />;
}

function RemoteSecretSequence<T>({ players, order, header, onComplete, remote, fromValue }: SecretProps<T>) {
  const [vals, setVals] = useState<Partial<Record<PlayerIndex, T>>>({});
  const done = useRef(false);
  const pending = (p: PlayerIndex) => order.includes(p) && !(p in vals);
  const spec = (p: PlayerIndex): ControlSpec | null =>
    pending(p) ? ({ ...remote(p), for: p, secret: true } as ControlSpec) : null;
  const accept = (p: PlayerIndex) => (v: ControlValue) => setVals((prev) => ({ ...prev, [p]: fromValue(v, p) }));
  useControl(spec(0), accept(0));
  useControl(spec(1), accept(1));
  const complete = order.every((p) => p in vals);
  useEffect(() => {
    if (complete && !done.current) {
      done.current = true;
      onComplete(vals);
    }
  }, [complete, vals, onComplete]);
  return (
    <div className="secret">
      {header}
      <div className="secret-status">
        {order.map((p) => (
          <span key={p} className={`secret-chip p${p} ${p in vals ? 'done' : ''}`}>
            {players[p]} {p in vals ? '🔒 zaključano' : '📱 odgovara na mobitelu…'}
          </span>
        ))}
      </div>
      <div className="phone-wait">
        <span className="phone-icon" aria-hidden>
          📱
        </span>
        <span>Odgovorite tajno na svojim mobitelima – odgovori se otkrivaju kad oboje odgovore.</span>
      </div>
    </div>
  );
}

function LocalSecretSequence<T>({ players, order, header, renderInput, onComplete }: SecretProps<T>) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const values = useRef<Partial<Record<PlayerIndex, T>>>({});
  const p = order[step];

  const submit = (v: T) => {
    values.current[p] = v;
    if (step + 1 < order.length) {
      setStep(step + 1);
      setReady(false);
    } else onComplete(values.current);
  };

  return (
    <div className="secret">
      {header}
      <div className="secret-status">
        {order.map((pp, i) => (
          <span key={pp} className={`secret-chip p${pp} ${i < step ? 'done' : ''}`}>
            {players[pp]} {i < step ? '🔒 zaključano' : i === step ? '… odgovara' : '… čeka'}
          </span>
        ))}
      </div>
      {!ready ? (
        <div className={`handoff p${p}`}>
          <div className="handoff-title">
            Uređaj preuzima <strong>{players[p]}</strong>
          </div>
          {order.length > 1 && <div className="muted">{players[(1 - p) as PlayerIndex]}, ne gledaj u ekran!</div>}
          <Button big onClick={() => setReady(true)} autoFocus>
            Ja sam {players[p]} – prikaži unos
          </Button>
        </div>
      ) : (
        <div className={`secret-input p${p}`} key={`${step}`}>
          <div className="secret-who">
            Tajni odgovor: <PlayerTag p={p} name={players[p]} />
          </div>
          {renderInput(p, submit)}
        </div>
      )}
    </div>
  );
}

export function NumberEntry({ onSubmit, unit, placeholder = 'Upiši broj' }: { onSubmit: (n: number) => void; unit?: string; placeholder?: string }) {
  const [v, setV] = useState('');
  const n = parseNumber(v);
  return (
    <form
      className="num-entry"
      onSubmit={(e) => {
        e.preventDefault();
        if (n !== null) onSubmit(n);
      }}
    >
      <div className="num-row">
        <input
          className="big-input masked"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          placeholder={placeholder}
          value={v}
          onChange={(e) => setV(e.target.value)}
          aria-label={placeholder}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="muted small">Unos je skriven točkicama. {n !== null ? 'Broj je prepoznat.' : ''}</div>
      <Button type="submit" big disabled={n === null}>
        Zaključaj odgovor
      </Button>
    </form>
  );
}

export function ChoiceEntry({ options, onSubmit }: { options: string[]; onSubmit: (i: number) => void }) {
  return (
    <div className={`choices choices-${options.length}`}>
      {options.map((o, i) => (
        <button key={i} className="choice" onClick={() => onSubmit(i)}>
          {options.length === 4 && <span className="choice-letter">{'ABCD'[i]}</span>}
          {o}
        </button>
      ))}
    </div>
  );
}

export function NextButton({ onClick, label = 'Dalje' }: { onClick: () => void; label?: string }) {
  return (
    <div className="next-row">
      <Control spec={{ for: 'any', kind: 'buttons', buttons: [{ id: 'next', label: `${label} →` }] }} onSubmit={onClick}>
        <Button big onClick={onClick} autoFocus>
          {label} →
        </Button>
      </Control>
    </div>
  );
}

/** Hrvatska množina: plural(1, 'pitanje', 'pitanja', 'pitanja'). */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
