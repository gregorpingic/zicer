import { useState } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { matchBoard } from '../core/scoring';
import { sfx } from '../core/sound';
import { Control } from '../remote/RemoteContext';
import { AnswerTimer, Button, NextButton, QuestionCard, ResultBanner, TurnBanner, pointsLine, useAnswerTime } from '../components/common';

type Phase = 'play' | 'steal' | 'done';

interface LogEntry {
  p: PlayerIndex;
  guess: string;
  result: 'hit' | 'miss' | 'vague' | 'dup' | 'timeout' | 'pass';
  index?: number;
  undone?: boolean;
}

export default function Feud({ question: q, active, players, multiplier, onDone }: GameProps<'feud'>) {
  const other = (1 - active) as PlayerIndex;
  const seconds = useAnswerTime();
  const [revealed, setRevealed] = useState<boolean[]>(() => q.answers.map(() => false));
  const [strikes, setStrikes] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [input, setInput] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [result, setResult] = useState<{ points: [number, number]; outcome: [Outcome, Outcome]; title: string } | null>(null);

  const bankOf = (rev: boolean[]) => q.answers.reduce((s, a, i) => s + (rev[i] ? a.points : 0), 0);
  const bank = bankOf(revealed);
  const attempt = log.length;
  const turnPlayer = phase === 'steal' ? other : active;

  const finish = (winner: PlayerIndex, pts: number, title: string, stealOutcome: Outcome, cleared = false) => {
    const points: [number, number] = [0, 0];
    points[winner] = pts;
    const outcome: [Outcome, Outcome] = [null, null];
    outcome[active] = winner === active ? (cleared ? 'correct' : 'partial') : 'wrong';
    outcome[other] = stealOutcome;
    setResult({ points, outcome, title });
    setPhase('done');
  };

  const addLog = (e: LogEntry) => setLog((l) => [...l, e]);

  const strike = (entry: LogEntry) => {
    sfx.wrong();
    addLog(entry);
    const s = strikes + 1;
    setStrikes(s);
    if (s >= 3) setPhase('steal');
  };

  const guessPlay = (raw: string) => {
    const g = raw.trim();
    if (!g) return;
    setInput('');
    const m = matchBoard(g, q.answers);
    if (m.index === null) {
      if (m.vague) return addLog({ p: active, guess: g, result: 'vague' });
      return strike({ p: active, guess: g, result: 'miss' });
    }
    if (revealed[m.index]) return addLog({ p: active, guess: g, result: 'dup', index: m.index });
    sfx.correct();
    const rev = revealed.map((r, k) => r || k === m.index);
    setRevealed(rev);
    setLastHit(m.index);
    addLog({ p: active, guess: g, result: 'hit', index: m.index });
    if (rev.every(Boolean)) setTimeout(() => finish(active, bankOf(rev), `${players[active]} je očistio/la ploču!`, null, true), 700);
  };

  const guessSteal = (raw: string | null) => {
    const g = (raw ?? '').trim();
    setInput('');
    const m = g ? matchBoard(g, q.answers) : { index: null, vague: false };
    if (m.index !== null && !revealed[m.index]) {
      sfx.correct();
      const rev = revealed.map((r, k) => r || k === m.index);
      setRevealed(rev);
      setLastHit(m.index);
      addLog({ p: other, guess: g, result: 'hit', index: m.index });
      finish(other, bankOf(rev), `${players[other]} krade banku s „${g}”!`, 'correct');
    } else {
      sfx.wrong();
      addLog({ p: other, guess: g || '—', result: raw === null ? 'timeout' : g ? 'miss' : 'pass' });
      finish(active, bank, `Krađa nije uspjela – banka ostaje igraču ${players[active]}.`, 'wrong');
    }
  };

  /** Poništava prihvaćeni odgovor (ako ga protivnik ne prihvaća). */
  const undo = (k: number) => {
    const e = log[k];
    if (!e || e.result !== 'hit' || e.undone || e.index === undefined || phase === 'done') return;
    setRevealed((r) => r.map((x, i) => (i === e.index ? false : x)));
    setLog((l) => l.map((x, i) => (i === k ? { ...x, undone: true } : x)));
    setLastHit(null);
    sfx.wrong();
  };
  let lastAcceptedIdx = -1;
  for (let k = log.length - 1; k >= 0; k--)
    if (log[k].result === 'hit' && !log[k].undone) {
      lastAcceptedIdx = k;
      break;
    }

  const last = log[log.length - 1];
  const lastMsg = !last
    ? undefined
    : last.result === 'vague'
      ? `„${last.guess}” je preopćenito – budi precizniji/a (bez kazne).`
      : last.result === 'dup'
        ? `„${last.guess}” je već otkriveno – pokušaj ponovno.`
        : last.result === 'miss'
          ? `„${last.guess}” nema na ploči!`
          : last.result === 'timeout'
            ? 'Isteklo je vrijeme!'
            : last.result === 'hit'
              ? last.undone
                ? 'Odgovor je poništen.'
                : `Točno! „${q.answers[last.index!].text}” +${q.answers[last.index!].points}`
              : undefined;
  const msgKind = !last ? '' : last.result === 'hit' && !last.undone ? 'msg-good' : last.result === 'miss' || last.result === 'timeout' ? 'msg-bad' : 'msg-info';

  return (
    <div className="game feud">
      {phase === 'play' && <TurnBanner p={active} name={players[active]} />}
      {phase === 'steal' && <TurnBanner p={other} name={players[other]}> – krađa!</TurnBanner>}
      <QuestionCard label={q.estimated ? 'Što kaže narod? · procijenjeni odgovori' : `Što kaže narod? · anketa: ${q.source}`} text={q.question} />

      <div className="feud-board">
        {q.answers.map((a, i) => {
          const open = revealed[i];
          const missed = phase === 'done' && !open;
          return (
            <div key={i} className={`feud-slot ${open ? 'open' : ''} ${missed ? 'missed' : ''} ${lastHit === i ? 'hit' : ''}`}>
              <span className="feud-num">{i + 1}</span>
              <span className="feud-text">{open || missed ? a.text : ''}</span>
              <span className="feud-pts">{open || missed ? a.points : ''}</span>
            </div>
          );
        })}
      </div>

      <div className="feud-status">
        <div className="feud-bank">
          Banka: <strong>{bank}</strong>
          {multiplier > 1 && <span className="muted"> (×{multiplier})</span>}
        </div>
        <div className="strikes" aria-label={`Pogreške: ${strikes} od 3`}>
          {[0, 1, 2].map((k) => (
            <span key={k} className={`strike ${k < strikes ? 'on' : ''}`}>
              ✕
            </span>
          ))}
        </div>
        {phase !== 'done' && (
          <AnswerTimer
            key={`${phase}-${attempt}`}
            onEnd={() => (phase === 'play' ? strike({ p: active, guess: '—', result: 'timeout' }) : guessSteal(null))}
          />
        )}
      </div>

      {lastMsg && phase !== 'done' && <div className={`msg ${msgKind}`}>{lastMsg}</div>}

      {(phase === 'play' || phase === 'steal') && (
        <Control
          spec={{
            for: turnPlayer,
            kind: 'text',
            title: phase === 'play' ? q.question : `Krađa! ${q.question}`,
            note: lastMsg,
            placeholder: phase === 'play' ? 'Upiši odgovor' : 'Odgovor za krađu',
            submitLabel: 'Provjeri',
            ...(seconds ? { timer: seconds } : {}),
            lines: [
              ...q.answers.map((a, i) => (revealed[i] ? `${i + 1}. ${a.text} – ${a.points}` : `${i + 1}. ············`)),
              `Banka: ${bank} · Pogreške: ${strikes}/3`,
            ],
            buttons: [phase === 'play' ? { id: 'strike', label: 'Ne znam (pogreška)', variant: 'bad' } : { id: 'giveup', label: 'Odustajem', variant: 'bad' }],
          }}
          onSubmit={(v) => {
            if (phase === 'play') {
              if (v.button === 'strike') strike({ p: active, guess: '—', result: 'pass' });
              else guessPlay(v.text || '');
            } else guessSteal(v.button === 'giveup' ? '' : v.text || '');
          }}
        >
          <form
            className="guess-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (phase === 'play') guessPlay(input);
              else guessSteal(input);
            }}
          >
            <input
              className="big-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={phase === 'play' ? 'Izgovori odgovor i upiši ga' : 'Odgovor za krađu'}
              autoComplete="off"
              aria-label="Odgovor"
            />
            <div className="row center">
              <Button type="submit" disabled={!input.trim()}>
                Provjeri
              </Button>
              {phase === 'play' ? (
                <Button variant="bad" onClick={() => strike({ p: active, guess: '—', result: 'pass' })}>
                  Ne znam (pogreška)
                </Button>
              ) : (
                <Button variant="bad" onClick={() => guessSteal('')}>
                  Odustajem
                </Button>
              )}
            </div>
          </form>
        </Control>
      )}

      {/* Protivnik može osporiti zadnji prihvaćeni odgovor (na mobitelu). */}
      {phase === 'play' && lastAcceptedIdx >= 0 && (
        <Control
          spec={{
            for: other,
            kind: 'buttons',
            role: 'objection',
            title: `${players[active]} je upisao/la „${log[lastAcceptedIdx].guess}” → prihvaćeno kao „${q.answers[log[lastAcceptedIdx].index!].text}”`,
            buttons: [{ id: 'object', label: 'Ne prihvaćam taj odgovor', variant: 'secondary' }],
          }}
          onSubmit={() => undo(lastAcceptedIdx)}
          silent
        />
      )}

      {log.length > 0 && (
        <div className="guess-log" aria-label="Upisani odgovori">
          {log.map((e, k) => (
            <span key={k} className={`log-item ${e.result} ${e.undone ? 'undone' : ''}`}>
              <strong className={`p${e.p}-text`}>{players[e.p]}:</strong> „{e.guess}”
              {e.result === 'hit'
                ? e.undone
                  ? '→ poništeno'
                  : `→ ${q.answers[e.index!].text} ✓`
                : e.result === 'vague'
                  ? '→ preopćenito'
                  : e.result === 'dup'
                    ? '→ već otkriveno'
                    : e.result === 'timeout'
                      ? '⌛'
                      : e.result === 'pass'
                        ? '→ ne zna'
                        : '✕'}
              {e.result === 'hit' && !e.undone && phase !== 'done' && (
                <button className="link-btn small" onClick={() => undo(k)}>
                  poništi
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {phase === 'done' && result && (
        <>
          <ResultBanner points={result.points} players={players} multiplier={multiplier} title={result.title} />
          <NextButton
            auto={9}
            phone={[result.title, ...q.answers.map((a, i) => `${i + 1}. ${a.text} – ${a.points}`), pointsLine(result.points, players, multiplier)]}
            onClick={() => onDone({ points: result.points, outcome: result.outcome, note: result.title })}
          />
        </>
      )}
    </div>
  );
}
