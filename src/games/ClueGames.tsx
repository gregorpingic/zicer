import { useState } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { POINTS, answerMatches, cluePoints } from '../core/scoring';
import { sfx } from '../core/sound';
import { Control } from '../remote/RemoteContext';
import { AnswerTimer, Button, Explanation, NextButton, QuestionCard, ResultBanner, TurnBanner, useAnswerTime } from '../components/common';

interface ClueProps {
  label: string;
  title: string;
  clues: string[];
  answer: string;
  accept?: string[];
  explanation?: string;
  source?: string;
  active: PlayerIndex;
  players: [string, string];
  multiplier: number;
  onDone: GameProps['onDone'];
}

type Phase = 'play' | 'steal' | 'judge' | 'done';

/** Postupno otkrivanje tragova. Igrač može upisati odgovor ili ga izgovoriti pa zajedno procijeniti. */
function ProgressiveClues(props: ClueProps) {
  const { clues, answer, accept, active, players, multiplier, onDone } = props;
  const other = (1 - active) as PlayerIndex;
  const n = clues.length;
  const seconds = useAnswerTime();
  const [shown, setShown] = useState(1);
  const [phase, setPhase] = useState<Phase>('play');
  const [judgeFor, setJudgeFor] = useState<'active' | 'steal'>('active');
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [lastWrongAt, setLastWrongAt] = useState<number | null>(null);
  const [result, setResult] = useState<{ points: [number, number]; outcome: [Outcome, Outcome]; title: string } | null>(null);

  const finish = (winner: PlayerIndex | null, stealTried: boolean, atClues = shown) => {
    const points: [number, number] = [0, 0];
    const outcome: [Outcome, Outcome] = [null, null];
    outcome[active] = winner === active ? 'correct' : 'wrong';
    if (stealTried) outcome[other] = winner === other ? 'correct' : 'wrong';
    if (winner === active) points[active] = cluePoints(n, atClues);
    if (winner === other) points[other] = POINTS.steal;
    const title =
      winner === active
        ? `${players[active]} pogađa nakon ${atClues}. traga!`
        : winner === other
          ? `${players[other]} krade!`
          : 'Nitko nije pogodio.';
    if (winner !== null) sfx.correct();
    else sfx.wrong();
    setResult({ points, outcome, title });
    setPhase('done');
  };

  const nextClue = () => {
    if (shown < n) {
      setShown(shown + 1);
      sfx.reveal();
    } else {
      setPhase('steal');
      setMsg(`Svi tragovi su otkriveni. ${players[other]} ima jedan pokušaj krađe.`);
    }
  };

  const check = (raw = input) => {
    const g = raw.trim();
    if (!g) return;
    setInput('');
    const ok = answerMatches(g, [answer, ...(accept || [])]);
    if (phase === 'steal') return ok ? finish(other, true) : finish(null, true);
    if (ok) return finish(active, false);
    sfx.wrong();
    setLastWrongAt(shown);
    setMsg(`„${g}” nije točno.`);
    nextClue();
  };

  const pointsNow = cluePoints(n, shown) * multiplier;

  return (
    <div className="game">
      {phase === 'play' && <TurnBanner p={active} name={players[active]}> · trenutačno vrijedi {pointsNow}</TurnBanner>}
      {phase === 'steal' && <TurnBanner p={other} name={players[other]}> – krađa za {POINTS.steal * multiplier}</TurnBanner>}
      <QuestionCard label={props.label} text={props.title} speakText={`${props.title}. ${clues.slice(0, shown).join('. ')}`} />
      <ol className="clues">
        {clues.map((c, i) => (
          <li key={i} className={`clue ${i < shown || phase === 'done' ? 'open' : ''} ${i === shown - 1 && phase === 'play' ? 'new' : ''}`}>
            <span className="clue-num">{i + 1}</span>
            <span className="clue-text">{i < shown || phase === 'done' ? c : ''}</span>
          </li>
        ))}
      </ol>

      {(phase === 'play' || phase === 'steal') && (
        <AnswerTimer
          key={`${phase}-${shown}`}
          onEnd={() => {
            if (phase === 'steal') return finish(null, true);
            setMsg('⌛ Isteklo je vrijeme – otvara se sljedeći trag.');
            nextClue();
          }}
        />
      )}
      {msg && (phase === 'play' || phase === 'steal') && <div className="msg msg-info">{msg}</div>}
      {(phase === 'play' || phase === 'steal') && (
        <Control
          spec={{
            for: phase === 'play' ? active : other,
            kind: 'text',
            title: phase === 'play' ? `${props.title} (vrijedi ${pointsNow})` : `Krađa! ${props.title}`,
            note: msg || undefined,
            placeholder: 'Upiši odgovor',
            submitLabel: 'Provjeri',
            ...(seconds ? { timer: seconds } : {}),
            buttons: [
              phase === 'play'
                ? { id: 'next', label: shown < n ? 'Sljedeći trag' : 'Odustajem', variant: 'secondary' }
                : { id: 'giveup', label: 'Odustajem', variant: 'bad' },
              { id: 'aloud', label: 'Rekao/la sam naglas – otkrij', variant: 'ghost' },
              ...(lastWrongAt !== null && phase === 'play'
                ? [{ id: 'wasright', label: 'Prethodni odgovor je ipak bio točan', variant: 'ghost' as const }]
                : []),
            ],
          }}
          onSubmit={(v) => {
            if (v.button === 'next') nextClue();
            else if (v.button === 'giveup') finish(null, true);
            else if (v.button === 'aloud') {
              setJudgeFor(phase === 'steal' ? 'steal' : 'active');
              setPhase('judge');
            } else if (v.button === 'wasright' && lastWrongAt !== null) finish(active, false, lastWrongAt);
            else check(v.text || '');
          }}
        >
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            className="big-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Upiši odgovor"
            autoComplete="off"
            aria-label="Odgovor"
          />
          <div className="row center">
            <Button type="submit" disabled={!input.trim()}>
              Provjeri
            </Button>
            {phase === 'play' && (
              <Button variant="secondary" onClick={nextClue}>
                {shown < n ? 'Sljedeći trag' : 'Odustajem'}
              </Button>
            )}
            {phase === 'steal' && (
              <Button variant="bad" onClick={() => finish(null, true)}>
                Odustajem
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setJudgeFor(phase === 'steal' ? 'steal' : 'active');
                setPhase('judge');
              }}
            >
              Rekao/la sam naglas – otkrij
            </Button>
          </div>
          {lastWrongAt !== null && phase === 'play' && (
            <button className="link-btn" onClick={() => finish(active, false, lastWrongAt)} type="button">
              Prethodni odgovor je ipak bio točan
            </button>
          )}
        </form>
        </Control>
      )}

      {phase === 'judge' && (
        <div className="center stack">
          <div className="solution big">{answer}</div>
          <div className="judge-q">Je li izgovoreni odgovor bio točan?</div>
          <Control
            spec={{
              for: 'any',
              kind: 'buttons',
              title: `Rješenje je na televizoru. Je li izgovoreni odgovor bio točan?`,
              buttons: [
                { id: 'yes', label: 'Da', variant: 'good' },
                { id: 'no', label: 'Ne', variant: 'bad' },
              ],
            }}
            onSubmit={(v) =>
              v.button === 'yes'
                ? judgeFor === 'active'
                  ? finish(active, false)
                  : finish(other, true)
                : finish(null, judgeFor === 'steal')
            }
          >
          <div className="row center">
            <Button big variant="good" onClick={() => (judgeFor === 'active' ? finish(active, false) : finish(other, true))}>
              Da
            </Button>
            <Button big variant="bad" onClick={() => finish(null, judgeFor === 'steal')}>
              Ne
            </Button>
          </div>
          </Control>
        </div>
      )}

      {phase === 'done' && result && (
        <>
          <div className="solution big">{answer}</div>
          <ResultBanner points={result.points} players={players} multiplier={multiplier} title={result.title} />
          <Explanation explanation={props.explanation} source={props.source} />
          <NextButton readText={props.explanation} onClick={() => onDone({ points: result.points, outcome: result.outcome, note: result.title })} />
        </>
      )}
    </div>
  );
}

export function Association({ question: q, ...p }: GameProps<'association'>) {
  return (
    <ProgressiveClues
      label="Asocijacije"
      title="Koji je zajednički pojam?"
      clues={q.clues}
      answer={q.answer}
      accept={q.accept}
      explanation={q.explanation}
      source={q.source}
      {...p}
    />
  );
}

export function Describe({ question: q, ...p }: GameProps<'describe'>) {
  return (
    <ProgressiveClues
      label="Pogodi po opisu"
      title={`Tko ili što sam? (${q.subject.toLowerCase()})`}
      clues={q.clues}
      answer={q.answer}
      accept={q.accept}
      explanation={q.explanation}
      source={q.source}
      {...p}
    />
  );
}
