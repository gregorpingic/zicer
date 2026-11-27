import { useState } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { answerMatches } from '../core/scoring';
import { sfx } from '../core/sound';
import { Control } from '../remote/RemoteContext';
import { Button, NextButton, PlayerTag, QuestionCard, ResultBanner, TurnBanner } from '../components/common';

type Phase = 'play' | 'steal' | 'done';

export default function Feud({ question: q, active, players, multiplier, onDone }: GameProps<'feud'>) {
  const other = (1 - active) as PlayerIndex;
  const [revealed, setRevealed] = useState<boolean[]>(() => q.answers.map(() => false));
  const [strikes, setStrikes] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'bad' | 'info' } | null>(null);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [result, setResult] = useState<{ points: [number, number]; outcome: [Outcome, Outcome]; title: string } | null>(null);

  const bankOf = (rev: boolean[]) => q.answers.reduce((s, a, i) => s + (rev[i] ? a.points : 0), 0);
  const bank = bankOf(revealed);

  const findMatch = (guess: string) =>
    q.answers.findIndex((a) => answerMatches(guess, [a.text, ...(a.accept || [])]));

  const finish = (winner: PlayerIndex, pts: number, title: string, stealOutcome: Outcome, cleared = false) => {
    const points: [number, number] = [0, 0];
    points[winner] = pts;
    const outcome: [Outcome, Outcome] = [null, null];
    outcome[active] = winner === active ? (cleared ? 'correct' : 'partial') : 'wrong';
    outcome[other] = stealOutcome;
    setResult({ points, outcome, title });
    setPhase('done');
  };

  const strike = () => {
    sfx.wrong();
    const s = strikes + 1;
    setStrikes(s);
    setMsg({ text: 'Nema na ploči!', kind: 'bad' });
    if (s >= 3) {
      setPhase('steal');
      setMsg({ text: `Tri pogreške! ${players[other]} može ukrasti banku jednim odgovorom.`, kind: 'info' });
    }
  };

  const guessPlay = (raw = input) => {
    const g = raw.trim();
    if (!g) return;
    setInput('');
    const i = findMatch(g);
    if (i >= 0 && revealed[i]) {
      setMsg({ text: `„${q.answers[i].text}” je već otkriveno – pokušaj ponovno.`, kind: 'info' });
      return;
    }
    if (i < 0) return strike();
    sfx.correct();
    const rev = revealed.map((r, k) => r || k === i);
    setRevealed(rev);
    setLastHit(i);
    setMsg({ text: `Točno! +${q.answers[i].points} u banku`, kind: 'good' });
    if (rev.every(Boolean)) {
      setTimeout(() => finish(active, bankOf(rev), `${players[active]} je očistio/la ploču!`, null, true), 600);
    }
  };

  const guessSteal = (giveUp = false, raw = input) => {
    const g = raw.trim();
    setInput('');
    const i = giveUp || !g ? -1 : findMatch(g);
    if (i >= 0 && !revealed[i]) {
      sfx.correct();
      const rev = revealed.map((r, k) => r || k === i);
      setRevealed(rev);
      setLastHit(i);
      finish(other, bankOf(rev), `${players[other]} krade banku!`, 'correct');
    } else {
      sfx.wrong();
      finish(active, bank, `Krađa nije uspjela – banka ostaje igraču ${players[active]}.`, 'wrong');
    }
  };

  const showAll = phase === 'done';

  return (
    <div className="game feud">
      {phase === 'play' && <TurnBanner p={active} name={players[active]} />}
      {phase === 'steal' && <TurnBanner p={other} name={players[other]}> – krađa!</TurnBanner>}
      <QuestionCard label={q.estimated ? 'Procijenjeni popularni odgovori (nije stvarna anketa)' : `Anketa · ${q.source}`} text={q.question} />

      <div className="feud-board">
        {q.answers.map((a, i) => {
          const open = revealed[i];
          const missed = showAll && !open;
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
            <span key={k} className={`strike ${k < strikes ? 'on' : ''}`}>✕</span>
          ))}
        </div>
      </div>

      {msg && phase !== 'done' && <div className={`msg msg-${msg.kind}`}>{msg.text}</div>}

      {(phase === 'play' || phase === 'steal') && (
        <Control
          spec={{
            for: phase === 'play' ? active : other,
            kind: 'text',
            title: phase === 'play' ? q.question : `Krađa! ${q.question}`,
            note: msg?.text,
            placeholder: phase === 'play' ? 'Upiši odgovor' : 'Odgovor za krađu',
            submitLabel: 'Provjeri',
            buttons: [
              phase === 'play'
                ? { id: 'strike', label: 'Ne znam (pogreška)', variant: 'bad' }
                : { id: 'giveup', label: 'Odustajem', variant: 'bad' },
            ],
          }}
          onSubmit={(v) => {
            if (phase === 'play') {
              if (v.button === 'strike') strike();
              else guessPlay(v.text || '');
            } else if (v.button === 'giveup') guessSteal(true, '');
            else guessSteal(false, v.text || '');
          }}
        >
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (phase === 'play') guessPlay();
            else guessSteal(false);
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
          <div className="row">
            <Button type="submit" disabled={!input.trim()}>
              Provjeri
            </Button>
            {phase === 'play' ? (
              <Button variant="bad" onClick={() => strike()}>
                Ne znam (pogreška)
              </Button>
            ) : (
              <Button variant="bad" onClick={() => guessSteal(true)}>
                Odustajem
              </Button>
            )}
          </div>
          <div className="muted small">Dovoljan je dio riječi – aplikacija prepoznaje padeže i slova bez kvačica.</div>
        </form>
        </Control>
      )}

      {phase === 'done' && result && (
        <>
          <ResultBanner points={result.points} players={players} multiplier={multiplier} title={result.title} />
          <NextButton onClick={() => onDone({ points: result.points, outcome: result.outcome, note: result.title })} />
        </>
      )}
      {phase === 'steal' && (
        <div className="muted small center">
          Ako <PlayerTag p={other} name={players[other]} /> pogodi preostali odgovor, uzima cijelu banku.
        </div>
      )}
    </div>
  );
}
