import { useEffect, useState, type ReactNode } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { POINTS, closestPoints, maxStake, pricePoints, speedBonus, yearPoints } from '../core/scoring';
import { sfx } from '../core/sound';
import {
  Button,
  ChoiceEntry,
  Explanation,
  NextButton,
  NumberEntry,
  QuestionCard,
  ResultBanner,
  SecretSequence,
  formatNumber,
  pointsLine,
  useSettings,
} from '../components/common';

type Pair<T> = [T | null, T | null];
const order = (active: PlayerIndex): PlayerIndex[] => [active, (1 - active) as PlayerIndex];
const pair = <T,>(v: Partial<Record<PlayerIndex, T | null>>): Pair<T> => [v[0] ?? null, v[1] ?? null];
const NO_ANSWER = <span className="muted">⌛ bez odgovora</span>;
type Times = Partial<Record<PlayerIndex, number>>;

/** Zbraja osnovne bodove i brzinski bonus (ako je uključen). */
function withSpeed(base: [number, number], correct: [boolean, boolean], times: Times, enabled: boolean): { points: [number, number]; bonus: [number, number] } {
  const bonus = enabled ? speedBonus(correct, [times[0], times[1]]) : ([0, 0] as [number, number]);
  return { points: [base[0] + bonus[0], base[1] + bonus[1]], bonus };
}

function SpeedNote({ bonus, times, players }: { bonus: [number, number]; times: Times; players: [string, string] }) {
  const p = bonus[0] ? 0 : bonus[1] ? 1 : null;
  if (p === null) return null;
  return (
    <div className="speed-note">
      ⚡ Brzinski bonus +{bonus[p]}: <strong>{players[p]}</strong> je točno odgovorio/la za {times[p]!.toFixed(1)} s
    </div>
  );
}

function useRevealSound(points: [number, number] | null) {
  const key = points ? points.join(',') : '';
  useEffect(() => {
    if (!key) return;
    const [a, b] = key.split(',').map(Number);
    if (a > 0 || b > 0) sfx.correct();
    else sfx.wrong();
  }, [key]);
}

function AnswerRow({ players, render }: { players: [string, string]; render: (p: PlayerIndex) => ReactNode }) {
  return (
    <div className="answers-row">
      {([0, 1] as const).map((p) => (
        <div key={p} className={`answer-box p${p}`}>
          <div className="answer-name">{players[p]}</div>
          {render(p)}
        </div>
      ))}
    </div>
  );
}

/** Bodovi za najbliži odgovor kad netko možda nije odgovorio na vrijeme. */
function closestWithMissing(a: Pair<number>, answer: number): [number, number] {
  const solo = (v: number) => POINTS.closestWin + (v === answer ? POINTS.closestExactBonus : 0);
  if (a[0] === null && a[1] === null) return [0, 0];
  if (a[0] === null) return [0, solo(a[1]!)];
  if (a[1] === null) return [solo(a[0]), 0];
  return closestPoints([a[0], a[1]], answer);
}

// ---------------- Najbliži pobjeđuje ----------------

export function Closest({ question: q, active, players, multiplier, onDone }: GameProps<'closest'>) {
  const [ans, setAns] = useState<Pair<number> | null>(null);
  const points = ans ? closestWithMissing(ans, q.answer) : null;
  useRevealSound(points);
  const card = <QuestionCard label="Najbliži pobjeđuje" text={q.question} />;
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<number>
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <NumberEntry unit={q.unit} onSubmit={submit} />}
          remote={() => ({ kind: 'number', title: q.question, unit: q.unit })}
          fromValue={(v) => v.number ?? 0}
          onComplete={(v) => setAns(pair(v))}
        />
      </div>
    );
  const outcome = points!.map((p) => (p >= POINTS.closestWin ? 'correct' : p > 0 ? 'partial' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className="solution">
        Točan odgovor: <strong>{formatNumber(q.answer)}</strong> {q.unit}
      </div>
      <AnswerRow
        players={players}
        render={(p) =>
          ans[p] === null ? (
            NO_ANSWER
          ) : (
            <>
              <div className="answer-val">
                {formatNumber(ans[p]!)} <span className="unit">{q.unit}</span>
              </div>
              <div className="muted">odstupanje {formatNumber(Math.abs(ans[p]! - q.answer))}</div>
            </>
          )
        }
      />
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Točno: ${formatNumber(q.answer)} ${q.unit ?? ''}`, pointsLine(points!, players, multiplier)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Istina ili laž ----------------

export function TrueFalse({ question: q, active, players, multiplier, onDone }: GameProps<'truefalse'>) {
  const { speedBonus: speedOn } = useSettings();
  const [ans, setAns] = useState<Pair<boolean> | null>(null);
  const [times, setTimes] = useState<Times>({});
  const scored = ans
    ? withSpeed(ans.map((a) => (a === q.answer ? POINTS.truefalse : 0)) as [number, number], ans.map((a) => a === q.answer) as [boolean, boolean], times, speedOn)
    : null;
  const points = scored ? scored.points : null;
  useRevealSound(points);
  const card = <QuestionCard label="Istina ili laž?" text={q.statement} />;
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<boolean>
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <ChoiceEntry options={['Istina', 'Laž']} onSubmit={(i) => submit(i === 0)} />}
          remote={() => ({ kind: 'choice', title: q.statement, options: ['Istina', 'Laž'] })}
          fromValue={(v) => v.choice === 0}
          onComplete={(v, t) => {
            setTimes(t);
            setAns(pair(v));
          }}
        />
      </div>
    );
  const outcome = ans.map((a) => (a === q.answer ? 'correct' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className={`solution big ${q.answer ? 'is-true' : 'is-false'}`}>{q.answer ? 'ISTINA' : 'LAŽ'}</div>
      <AnswerRow
        players={players}
        render={(p) =>
          ans[p] === null ? (
            NO_ANSWER
          ) : (
            <div className={`answer-val ${ans[p] === q.answer ? 'good' : 'bad'}`}>
              {ans[p] ? 'Istina' : 'Laž'} {ans[p] === q.answer ? '✓' : '✕'}
            </div>
          )
        }
      />
      <SpeedNote bonus={scored!.bonus} times={times} players={players} />
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Točno: ${q.answer ? 'ISTINA' : 'LAŽ'}`, pointsLine(points!, players, multiplier)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Veće ili manje ----------------

export function HigherLower({ question: q, active, players, multiplier, onDone }: GameProps<'higherlower'>) {
  const { speedBonus: speedOn } = useSettings();
  const [ans, setAns] = useState<Pair<number> | null>(null);
  const [times, setTimes] = useState<Times>({});
  const scored = ans
    ? withSpeed(ans.map((a) => (a === q.correct ? POINTS.higherlower : 0)) as [number, number], ans.map((a) => a === q.correct) as [boolean, boolean], times, speedOn)
    : null;
  const points = scored ? scored.points : null;
  useRevealSound(points);
  const card = <QuestionCard label="Veće ili manje?" text={q.question} />;
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<number>
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <ChoiceEntry options={q.options} onSubmit={submit} />}
          remote={() => ({ kind: 'choice', title: q.question, options: q.options })}
          fromValue={(v) => v.choice ?? 0}
          onComplete={(v, t) => {
            setTimes(t);
            setAns(pair(v));
          }}
        />
      </div>
    );
  const outcome = ans.map((a) => (a === q.correct ? 'correct' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className="solution big">{q.options[q.correct]}</div>
      <SpeedNote bonus={scored!.bonus} times={times} players={players} />
      <AnswerRow
        players={players}
        render={(p) =>
          ans[p] === null ? (
            NO_ANSWER
          ) : (
            <div className={`answer-val ${ans[p] === q.correct ? 'good' : 'bad'}`}>
              {q.options[ans[p]!]} {ans[p] === q.correct ? '✓' : '✕'}
            </div>
          )
        }
      />
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Točno: ${q.options[q.correct]}`, pointsLine(points!, players, multiplier)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Pogodi godinu ----------------

export function Year({ question: q, active, players, multiplier, onDone }: GameProps<'year'>) {
  const [ans, setAns] = useState<Pair<number> | null>(null);
  const points = ans ? (ans.map((a) => (a === null ? 0 : yearPoints(a, q.answer))) as [number, number]) : null;
  useRevealSound(points);
  const card = <QuestionCard label="Pogodi godinu" text={q.question} />;
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<number>
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <NumberEntry placeholder="Godina" onSubmit={(n) => submit(Math.round(n))} />}
          remote={() => ({ kind: 'number', title: q.question, placeholder: 'Godina' })}
          fromValue={(v) => Math.round(v.number ?? 0)}
          onComplete={(v) => setAns(pair(v))}
        />
      </div>
    );
  const outcome = points!.map((p) => (p >= 25 ? 'correct' : p > 0 ? 'partial' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className="solution big">{q.answer}.</div>
      <AnswerRow
        players={players}
        render={(p) =>
          ans[p] === null ? (
            NO_ANSWER
          ) : (
            <>
              <div className="answer-val">{ans[p]}.</div>
              <div className="muted">{ans[p] === q.answer ? 'točno!' : `${Math.abs(ans[p]! - q.answer)} god. razlike`}</div>
            </>
          )
        }
      />
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Točno: ${q.answer}.`, pointsLine(points!, players, multiplier)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Riskiraj bodove ----------------

function StakeEntry({ max, onSubmit }: { max: number; onSubmit: (n: number) => void }) {
  const [v, setV] = useState(Math.min(10, max));
  const quick = [0, Math.round(max / 4), Math.round(max / 2), max];
  return (
    <div className="stake">
      <div className="stake-val">{v}</div>
      <input type="range" min={0} max={max} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Ulog" />
      <div className="row center">
        {[...new Set(quick)].map((n) => (
          <Button key={n} variant="secondary" onClick={() => setV(n)}>
            {n === max ? `Sve (${n})` : n}
          </Button>
        ))}
      </div>
      <Button big onClick={() => onSubmit(v)}>
        Zaključaj ulog
      </Button>
    </div>
  );
}

export function Risk({ question: q, active, players, scores, onDone }: GameProps<'risk'>) {
  const [stakes, setStakes] = useState<[number, number] | null>(null);
  const [ans, setAns] = useState<Pair<number> | null>(null);
  const points = stakes && ans ? (ans.map((a, p) => (a === q.correct ? stakes[p] : -stakes[p])) as [number, number]) : null;
  useRevealSound(points);

  if (!stakes)
    return (
      <div className="game">
        <SecretSequence<number>
          players={players}
          order={order(active)}
          header={
            <div className="qcard">
              <div className="qcard-label">Riskiraj bodove · kategorija: {q.category}</div>
              <div className="qcard-text">Koliko bodova ulažeš prije nego što vidiš pitanje?</div>
            </div>
          }
          renderInput={(p, submit) => (
            <>
              <div className="muted center">
                Tvoji bodovi: {scores[p]} · najveći mogući ulog: {maxStake(scores[p])}
              </div>
              <StakeEntry max={maxStake(scores[p])} onSubmit={submit} />
            </>
          )}
          remote={(p) => ({ kind: 'stake', title: `Koliko ulažeš? Kategorija: ${q.category}`, max: maxStake(scores[p]), score: scores[p] })}
          fromValue={(v, p) => Math.max(0, Math.min(maxStake(scores[p]), Math.round(v.number ?? 0)))}
          onComplete={(v) => setStakes([v[0] ?? 0, v[1] ?? 0])}
        />
      </div>
    );

  const card = <QuestionCard label={`Riskiraj bodove · ${q.category}`} text={q.question} />;
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<number>
          key="answers"
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <ChoiceEntry options={q.options} onSubmit={submit} />}
          remote={() => ({ kind: 'choice', title: q.question, options: q.options })}
          fromValue={(v) => v.choice ?? 0}
          onComplete={(v) => setAns(pair(v))}
        />
      </div>
    );

  const outcome = ans.map((a) => (a === q.correct ? 'correct' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className="solution">
        Točan odgovor: <strong>{q.options[q.correct]}</strong>
      </div>
      <AnswerRow
        players={players}
        render={(p) => (
          <>
            {ans[p] === null ? (
              NO_ANSWER
            ) : (
              <div className={`answer-val ${ans[p] === q.correct ? 'good' : 'bad'}`}>
                {q.options[ans[p]!]} {ans[p] === q.correct ? '✓' : '✕'}
              </div>
            )}
            <div className="muted">ulog: {stakes[p]}</div>
          </>
        )}
      />
      <ResultBanner points={points!} players={players} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Točno: ${q.options[q.correct]}`, pointsLine(points!, players, 1)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Pogodi cijenu ----------------

const eur = (n: number) => `${n.toLocaleString('hr-HR', { minimumFractionDigits: n < 100 && n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

export function Price({ question: q, active, players, multiplier, onDone }: GameProps<'price'>) {
  const [ans, setAns] = useState<Pair<number> | null>(null);
  const points = ans ? pricePoints(ans, q.answer) : null;
  useRevealSound(points);
  const card = (
    <QuestionCard label="Pogodi cijenu · u eurima" text={`Koliko košta: ${q.item}?`}>
      {q.details && <div className="qcard-sub">{q.details}</div>}
    </QuestionCard>
  );
  if (!ans)
    return (
      <div className="game">
        <SecretSequence<number>
          players={players}
          order={order(active)}
          header={card}
          renderInput={(_, submit) => <NumberEntry unit="€" placeholder="Cijena u eurima" onSubmit={submit} />}
          remote={() => ({ kind: 'number', title: `Koliko košta: ${q.item}?${q.details ? ` (${q.details})` : ''}`, unit: '€', placeholder: 'Cijena u eurima' })}
          fromValue={(v) => Math.max(0, v.number ?? 0)}
          onComplete={(v) => setAns(pair(v))}
        />
      </div>
    );
  const near = (g: number) => Math.abs(g - q.answer) <= q.answer * 0.1;
  const outcome = ans.map((g, p) => (g === null ? 'wrong' : near(g) ? 'correct' : points![p] > 0 ? 'partial' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      {card}
      <div className="solution big">≈ {eur(q.answer)}</div>
      <AnswerRow
        players={players}
        render={(p) =>
          ans[p] === null ? (
            NO_ANSWER
          ) : (
            <>
              <div className={`answer-val ${near(ans[p]!) ? 'good' : ''}`}>{eur(ans[p]!)}</div>
              <div className="muted">
                {near(ans[p]!) ? 'unutar ±10 % – bonus!' : `${ans[p]! > q.answer ? 'previše' : 'premalo'} za ${eur(Math.abs(ans[p]! - q.answer))}`}
              </div>
            </>
          )
        }
      />
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton readText={q.explanation} phone={[`Cijena: ≈ ${eur(q.answer)}`, pointsLine(points!, players, multiplier)]} onClick={() => onDone({ points: points!, outcome })} />
    </div>
  );
}

// ---------------- Tko je stariji? (brza serija usporedbi) ----------------

export function Versus({ question: q, active, players, multiplier, onDone }: GameProps<'versus'>) {
  const [k, setK] = useState(0);
  const [answers, setAnswers] = useState<Pair<number>[]>([]);
  const done = answers.length === q.pairs.length;
  const right = ([0, 1] as const).map((p) => answers.filter((a, i) => a[p] === q.pairs[i].correct).length);
  const points = done
    ? (right.map((n) => n * POINTS.versusPerPair + (n === q.pairs.length ? POINTS.versusAllBonus : 0)) as [number, number])
    : null;
  useRevealSound(points);
  const pr = q.pairs[Math.min(k, q.pairs.length - 1)];
  const opts = [pr.a, pr.b];
  const card = <QuestionCard label={`Tko je stariji? · ${Math.min(k + 1, q.pairs.length)}/${q.pairs.length}`} text={q.prompt} />;
  if (!done)
    return (
      <div className="game">
        {answers.length > 0 && (
          <div className="versus-last">
            Prethodno: <strong>{[q.pairs[k - 1].a, q.pairs[k - 1].b][q.pairs[k - 1].correct]}</strong>
            {q.pairs[k - 1].values && <span className="muted"> ({q.pairs[k - 1].values!.join(' / ')})</span>}
            {' · '}
            {players.map((n, p) => `${n} ${answers[k - 1][p] === q.pairs[k - 1].correct ? '✓' : '✕'}`).join('  ')}
          </div>
        )}
        <SecretSequence<number>
          key={k}
          players={players}
          order={order(active)}
          header={
            <>
              {card}
              <div className="versus-pair">
                <span>{pr.a}</span>
                <span className="vs">ili</span>
                <span>{pr.b}</span>
              </div>
            </>
          }
          renderInput={(_, submit) => <ChoiceEntry options={opts} onSubmit={submit} />}
          remote={() => ({ kind: 'choice', title: `${q.prompt} (${k + 1}/${q.pairs.length})`, options: opts })}
          fromValue={(v) => v.choice ?? 0}
          onComplete={(v) => {
            const a = pair<number>(v);
            if (a[0] === q.pairs[k].correct || a[1] === q.pairs[k].correct) sfx.correct();
            else sfx.wrong();
            setAnswers((prev) => [...prev, a]);
            setK((x) => x + 1);
          }}
        />
      </div>
    );
  const outcome = right.map((n) => (n === q.pairs.length ? 'correct' : n > 0 ? 'partial' : 'wrong')) as [Outcome, Outcome];
  return (
    <div className="game">
      <QuestionCard label="Tko je stariji?" text={q.prompt} />
      <table className="stats-table versus-table">
        <thead>
          <tr>
            <th>Točno</th>
            <th>{players[0]}</th>
            <th>{players[1]}</th>
          </tr>
        </thead>
        <tbody>
          {q.pairs.map((x, i) => (
            <tr key={i}>
              <td>
                <strong>{[x.a, x.b][x.correct]}</strong> <span className="muted">vs {[x.a, x.b][1 - x.correct]}</span>
                {x.values && <div className="muted small">{x.values[x.correct]} · {x.values[1 - x.correct]}</div>}
              </td>
              {([0, 1] as const).map((p) => (
                <td key={p} className={answers[i][p] === x.correct ? 'good' : 'bad'}>
                  {answers[i][p] === null ? '⌛' : answers[i][p] === x.correct ? '✓' : '✕'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ResultBanner points={points!} players={players} multiplier={multiplier} />
      <Explanation explanation={q.explanation} source={q.source} />
      <NextButton
        phone={[`${players[0]} ${right[0]}/${q.pairs.length} · ${players[1]} ${right[1]}/${q.pairs.length}`, pointsLine(points!, players, multiplier)]}
        onClick={() => onDone({ points: points!, outcome })}
      />
    </div>
  );
}
