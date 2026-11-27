import { useMemo, useState } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { POINTS, normalize, orderPoints } from '../core/scoring';
import { shuffle } from '../core/engine';
import { sfx } from '../core/sound';
import {
  Button,
  Explanation,
  NextButton,
  PlayerTag,
  QuestionCard,
  ResultBanner,
  SecretSequence,
  Timer,
  TurnBanner,
  useSettings,
} from '../components/common';
import { Control } from '../remote/RemoteContext';

const otherOf = (p: PlayerIndex) => (1 - p) as PlayerIndex;

// ---------------- Odabir s krađom (Klasični kviz, Izbaci uljeza) ----------------

function OptionsWithSteal({
  options,
  correct,
  active,
  players,
  multiplier,
  winPoints,
  label,
  text,
  explanation,
  source,
  onDone,
}: {
  options: string[];
  correct: number;
  active: PlayerIndex;
  players: [string, string];
  multiplier: number;
  winPoints: number;
  label: string;
  text: string;
  explanation?: string;
  source?: string;
  onDone: GameProps['onDone'];
}) {
  const other = otherOf(active);
  const [first, setFirst] = useState<number | null>(null);
  const [steal, setSteal] = useState<number | null | 'declined'>(null);
  const phase = first === null ? 'answer' : first === correct ? 'done' : steal === null ? 'steal' : 'done';

  const pickFirst = (i: number) => {
    setFirst(i);
    if (i === correct) sfx.correct();
    else sfx.wrong();
  };
  const pickSteal = (i: number) => {
    setSteal(i);
    if (i === correct) sfx.correct();
    else sfx.wrong();
  };

  const points: [number, number] = [0, 0];
  const outcome: [Outcome, Outcome] = [null, null];
  if (phase === 'done') {
    outcome[active] = first === correct ? 'correct' : 'wrong';
    if (first === correct) points[active] = winPoints;
    else if (typeof steal === 'number') {
      outcome[other] = steal === correct ? 'correct' : 'wrong';
      if (steal === correct) points[other] = POINTS.steal;
    }
  }

  const optClass = (i: number) => {
    if (phase !== 'done') return i === first ? 'choice wrong' : 'choice';
    if (i === correct) return 'choice right';
    if (i === first || i === steal) return 'choice wrong';
    return 'choice dim';
  };

  // Na televizoru se ponuđeni odgovori uvijek vide; biraju se na mobitelu igrača na potezu.
  const board = (clickable: boolean) => (
    <div className={`choices choices-${options.length}`}>
      {options.map((o, i) => (
        <button
          key={i}
          className={optClass(i)}
          disabled={!clickable || phase === 'done' || (phase === 'steal' && i === first)}
          onClick={() => (phase === 'answer' ? pickFirst(i) : pickSteal(i))}
        >
          {options.length === 4 && <span className="choice-letter">{'ABCD'[i]}</span>}
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="game">
      {phase === 'answer' && <TurnBanner p={active} name={players[active]} />}
      {phase === 'steal' && <TurnBanner p={other} name={players[other]}> – može ukrasti za {POINTS.steal * multiplier}</TurnBanner>}
      <QuestionCard label={label} text={text} />
      {phase === 'answer' && (
        <Control
          spec={{ for: active, kind: 'choice', title: text, options }}
          onSubmit={(v) => v.choice !== undefined && pickFirst(v.choice)}
          display={board(false)}
        >
          {board(true)}
        </Control>
      )}
      {phase === 'steal' && (
        <Control
          spec={{
            for: other,
            kind: 'choice',
            title: `Krađa za ${POINTS.steal * multiplier} bodova: ${text}`,
            options,
            disabled: first === null ? [] : [first],
            buttons: [{ id: 'decline', label: 'Ne želim krasti', variant: 'ghost' }],
          }}
          onSubmit={(v) => (v.choice !== undefined ? pickSteal(v.choice) : setSteal('declined'))}
          display={board(false)}
        >
          {board(true)}
          <div className="row center">
            <Button variant="ghost" onClick={() => setSteal('declined')}>
              {players[other]} ne želi krasti
            </Button>
          </div>
        </Control>
      )}
      {phase === 'done' && (
        <>
          {board(false)}
          <ResultBanner points={points} players={players} multiplier={multiplier} />
          <Explanation explanation={explanation} source={source} />
          <NextButton onClick={() => onDone({ points, outcome })} />
        </>
      )}
    </div>
  );
}

export function Quiz({ question: q, active, players, multiplier, onDone }: GameProps<'quiz'>) {
  return (
    <OptionsWithSteal
      options={q.options}
      correct={q.correct}
      active={active}
      players={players}
      multiplier={multiplier}
      winPoints={POINTS.quiz}
      label={`Klasični kviz · ${q.category}`}
      text={q.question}
      explanation={q.explanation}
      source={q.source}
      onDone={onDone}
    />
  );
}

export function OddOne({ question: q, active, players, multiplier, onDone }: GameProps<'oddone'>) {
  return (
    <OptionsWithSteal
      options={q.items}
      correct={q.odd}
      active={active}
      players={players}
      multiplier={multiplier}
      winPoints={POINTS.oddone}
      label="Izbaci uljeza"
      text={q.prompt || 'Koji pojam ne pripada skupini?'}
      explanation={q.explanation}
      source={q.source}
      onDone={onDone}
    />
  );
}

// ---------------- Poredaj po redu ----------------

export function Order({ question: q, active, players, multiplier, onDone }: GameProps<'order'>) {
  // arrangement sadrži indekse iz točnog poretka
  const [arr, setArr] = useState<number[]>(() => {
    const idx = q.items.map((_, i) => i);
    let s = shuffle(idx);
    for (let k = 0; k < 5 && s.every((v, i) => v === i); k++) s = shuffle(idx);
    return s;
  });
  const [locked, setLocked] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const res = orderPoints(arr);
  const points: [number, number] = [0, 0];
  points[active] = res.points;
  const outcome: [Outcome, Outcome] = [null, null];
  outcome[active] = res.points === POINTS.orderAll ? 'correct' : res.correctPositions > 0 ? 'partial' : 'wrong';

  const move = (from: number, to: number) => {
    if (to < 0 || to >= arr.length || locked) return;
    const a = [...arr];
    const [x] = a.splice(from, 1);
    a.splice(to, 0, x);
    setArr(a);
  };

  const lock = (finalArr: number[]) => {
    setArr(finalArr);
    setLocked(true);
    if (orderPoints(finalArr).points > 0) sfx.correct();
    else sfx.wrong();
  };

  const list = (editable: boolean) => (
    <ol className="order-list">
      {arr.map((itemIdx, pos) => {
        const ok = itemIdx === pos;
        return (
          <li
            key={itemIdx}
            className={`order-item ${locked ? (ok ? 'right' : 'wrong') : ''} ${drag === pos ? 'dragging' : ''}`}
            draggable={editable}
            onDragStart={() => setDrag(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag !== null) move(drag, pos);
              setDrag(null);
            }}
            onDragEnd={() => setDrag(null)}
          >
            <span className="order-pos">{pos + 1}</span>
            <span className="order-text">
              {q.items[itemIdx]}
              {locked && q.values && <span className="order-val"> · {q.values[itemIdx]}</span>}
            </span>
            {editable ? (
              <span className="order-btns">
                <button aria-label="Pomakni gore" onClick={() => move(pos, pos - 1)} disabled={pos === 0}>
                  ▲
                </button>
                <button aria-label="Pomakni dolje" onClick={() => move(pos, pos + 1)} disabled={pos === arr.length - 1}>
                  ▼
                </button>
              </span>
            ) : locked ? (
              <span className="order-mark">{ok ? '✓' : `→ ${itemIdx + 1}.`}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="game">
      {!locked && <TurnBanner p={active} name={players[active]} />}
      <QuestionCard label="Poredaj po redu" text={q.prompt} />
      {!locked ? (
        <>
          <Control
            spec={{ for: active, kind: 'order', title: q.prompt, items: arr.map((i) => q.items[i]) }}
            onSubmit={(v) => v.order && v.order.length === arr.length && lock(v.order.map((k) => arr[k]))}
            display={list(false)}
          >
            {list(true)}
            <div className="next-row">
              <Button big onClick={() => lock(arr)}>
                Zaključaj poredak
              </Button>
            </div>
          </Control>
        </>
      ) : (
        <>
          {list(false)}
          <div className="solution">
            Točan poredak: {q.items.map((t, i) => `${i + 1}. ${t}`).join(' · ')}
          </div>
          <ResultBanner
            points={points}
            players={players}
            multiplier={multiplier}
            title={`${res.correctPositions} od ${arr.length} na točnom mjestu`}
          />
          <Explanation explanation={q.explanation} source={q.source} />
          <NextButton onClick={() => onDone({ points, outcome })} />
        </>
      )}
    </div>
  );
}

// ---------------- Nabroji tri ----------------

export function List3({ question: q, active, players, multiplier, onDone }: GameProps<'list3'>) {
  const settings = useSettings();
  const other = otherOf(active);
  const count = q.count ?? 3;
  const [phase, setPhase] = useState<'ready' | 'run' | 'judge' | 'done'>('ready');
  const [valid, setValid] = useState(0);
  const points: [number, number] = [0, 0];
  points[active] = valid * POINTS.list3PerItem;
  const outcome: [Outcome, Outcome] = [null, null];
  outcome[active] = valid >= count ? 'correct' : valid > 0 ? 'partial' : 'wrong';

  const judge = (n: number) => {
    setValid(n);
    setPhase('done');
    if (n > 0) sfx.correct();
    else sfx.wrong();
  };

  return (
    <div className="game">
      <TurnBanner p={active} name={players[active]} />
      <QuestionCard label="Nabroji tri" text={q.prompt} />
      {phase === 'ready' && (
        <div className="center stack">
          <div className="muted">
            {settings.timer ? `Imaš ${settings.timer} sekundi.` : 'Bez vremenskog ograničenja.'} Odgovaraj naglas.
          </div>
          <Control
            spec={{ for: active, kind: 'buttons', title: q.prompt, note: 'Kad pritisneš Kreni, kreće vrijeme. Odgovaraj naglas.', buttons: [{ id: 'go', label: 'Kreni!' }] }}
            onSubmit={() => setPhase('run')}
          >
            <Button big onClick={() => setPhase('run')} autoFocus>
              Kreni!
            </Button>
          </Control>
        </div>
      )}
      {phase === 'run' && (
        <div className="center stack">
          <Timer seconds={settings.timer} running onEnd={() => setPhase('judge')} />
          <Control spec={{ for: active, kind: 'buttons', title: 'Nabrajaj naglas!', buttons: [{ id: 'done', label: 'Gotovo' }] }} onSubmit={() => setPhase('judge')}>
            <Button big onClick={() => setPhase('judge')}>
              Gotovo
            </Button>
          </Control>
        </div>
      )}
      {phase === 'judge' && (
        <div className="center stack">
          <div className="judge-q">
            <PlayerTag p={other} name={players[other]} />, koliko je odgovora bilo valjano?
          </div>
          <Control
            spec={{
              for: other,
              kind: 'buttons',
              title: `Koliko je valjanih odgovora rekao/la ${players[active]}?`,
              buttons: Array.from({ length: count + 1 }, (_, n) => ({ id: String(n), label: String(n), variant: n === 0 ? 'bad' : 'secondary' })),
            }}
            onSubmit={(v) => judge(Number(v.button) || 0)}
          >
            <div className="row center">
              {Array.from({ length: count + 1 }, (_, n) => (
                <Button key={n} big variant={n === 0 ? 'bad' : 'secondary'} onClick={() => judge(n)}>
                  {n}
                </Button>
              ))}
            </div>
          </Control>
        </div>
      )}
      {phase === 'done' && (
        <>
          <ResultBanner points={points} players={players} multiplier={multiplier} title={`Valjanih odgovora: ${valid}`} />
          {q.examples?.length ? (
            <div className="explain">
              <p className="muted">Primjeri mogućih odgovora: {q.examples.join(', ')}</p>
            </div>
          ) : null}
          <NextButton onClick={() => onDone({ points, outcome })} />
        </>
      )}
    </div>
  );
}

// ---------------- Koliko me poznaješ? ----------------

export function KnowMe({ question: q, active, players, multiplier, onDone }: GameProps<'knowme'>) {
  // active = onaj koji pogađa; drugi igrač tajno odgovara o sebi
  const guesser = active;
  const subject = otherOf(active);
  const [secret, setSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<Outcome>(null);
  const [text, setText] = useState('');

  const points: [number, number] = [0, 0];
  points[guesser] = verdict === 'correct' ? POINTS.knowmeCorrect : verdict === 'partial' ? POINTS.knowmePartial : 0;
  const outcome: [Outcome, Outcome] = [null, null];
  outcome[guesser] = verdict;

  const decide = (v: 'correct' | 'partial' | 'wrong') => {
    setVerdict(v);
    if (v === 'correct') sfx.correct();
    else if (v === 'partial') sfx.reveal();
    else sfx.wrong();
  };

  const card = <QuestionCard label={`Koliko me poznaješ? · pitanje za: ${players[subject]}`} text={q.question} />;

  if (secret === null)
    return (
      <div className="game">
        <SecretSequence<string>
          players={players}
          order={[subject]}
          header={card}
          renderInput={(_, submit) => (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) submit(text.trim());
              }}
            >
              <input
                className="big-input"
                autoFocus
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tvoj iskreni odgovor"
                aria-label="Tvoj odgovor"
              />
              <Button type="submit" big disabled={!text.trim()}>
                Zaključaj i predaj uređaj
              </Button>
            </form>
          )}
          remote={() => ({ kind: 'text', title: q.question, placeholder: 'Tvoj iskreni odgovor', submitLabel: 'Zaključaj odgovor' })}
          fromValue={(v) => (v.text || '').trim() || '–'}
          onComplete={(v) => setSecret(v[subject]!)}
        />
      </div>
    );

  const verdictButtons = [
    { id: 'correct', label: `Točno (+${POINTS.knowmeCorrect * multiplier})`, variant: 'good' as const },
    { id: 'partial', label: `Djelomično (+${POINTS.knowmePartial * multiplier})`, variant: 'secondary' as const },
    { id: 'wrong', label: 'Netočno', variant: 'bad' as const },
  ];

  return (
    <div className="game">
      <TurnBanner p={guesser} name={players[guesser]}> pogađa</TurnBanner>
      {card}
      {!revealed ? (
        <div className="center stack">
          <div className="muted">
            {players[subject]} je zaključao/la odgovor. {players[guesser]}, reci naglas što misliš da je odgovor.
          </div>
          <Control
            spec={{ for: 'any', kind: 'buttons', title: `${players[guesser]} pogađa naglas`, buttons: [{ id: 'reveal', label: 'Otkrij odgovor' }] }}
            onSubmit={() => setRevealed(true)}
          >
            <Button big onClick={() => setRevealed(true)} autoFocus>
              Otkrij odgovor
            </Button>
          </Control>
        </div>
      ) : (
        <>
          <div className="solution big">„{secret}”</div>
          {verdict === null ? (
            <div className="center stack">
              <div className="judge-q">Zajedno odlučite – je li pogodak točan?</div>
              <Control
                spec={{ for: 'any', kind: 'buttons', title: 'Je li pogodak točan?', buttons: verdictButtons }}
                onSubmit={(v) => decide((v.button as 'correct' | 'partial' | 'wrong') || 'wrong')}
              >
                <div className="row center">
                  {verdictButtons.map((b) => (
                    <Button key={b.id} big variant={b.variant} onClick={() => decide(b.id as 'correct' | 'partial' | 'wrong')}>
                      {b.label}
                    </Button>
                  ))}
                </div>
              </Control>
            </div>
          ) : (
            <>
              <ResultBanner points={points} players={players} multiplier={multiplier} />
              <NextButton onClick={() => onDone({ points, outcome })} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Kategorijski dvoboj ----------------

export function Category({ question: q, active, players, multiplier, onDone }: GameProps<'category'>) {
  const settings = useSettings();
  const turnSeconds = settings.timer === 0 ? 0 : Math.min(settings.timer, 20);
  const [turn, setTurn] = useState<PlayerIndex>(active);
  const [said, setSaid] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loser, setLoser] = useState<PlayerIndex | null>(null);
  const [reason, setReason] = useState('');
  const [warn, setWarn] = useState('');
  const [started, setStarted] = useState(false);
  const saidNorm = useMemo(() => new Set(said.map(normalize)), [said]);

  const accept = (raw: string) => {
    const t = raw.trim();
    if (t && saidNorm.has(normalize(t))) {
      setWarn(`„${t}” je već izgovoreno! Ponavljanje znači poraz.`);
      return;
    }
    setWarn('');
    setSaid((s) => [...s, t || `odgovor ${s.length + 1}`]);
    setInput('');
    setTurn(otherOf(turn));
    sfx.reveal();
  };
  const lose = (why: string) => {
    setLoser(turn);
    setReason(why);
    sfx.wrong();
  };

  if (loser !== null) {
    const winner = otherOf(loser);
    const points: [number, number] = [0, 0];
    points[winner] = POINTS.categoryWin;
    const outcome: [Outcome, Outcome] = [null, null];
    outcome[winner] = 'correct';
    outcome[loser] = 'wrong';
    return (
      <div className="game">
        <QuestionCard label="Kategorijski dvoboj" text={q.topic} />
        <ResultBanner
          points={points}
          players={players}
          multiplier={multiplier}
          title={`${players[loser]}: ${reason}. Pobjeđuje ${players[winner]}! (valjanih odgovora: ${said.length})`}
        />
        {q.examples?.length ? <div className="explain muted">Još neki primjeri: {q.examples.join(', ')}</div> : null}
        <NextButton onClick={() => onDone({ points, outcome })} />
      </div>
    );
  }

  const opp = otherOf(turn);
  return (
    <div className="game">
      <TurnBanner p={turn} name={players[turn]} />
      <QuestionCard label="Kategorijski dvoboj" text={q.topic} />
      {!started ? (
        <div className="center stack">
          <div className="muted">
            Počinje {players[active]}. {turnSeconds ? `Svaki potez traje najviše ${turnSeconds} s.` : 'Bez vremenskog ograničenja.'}
          </div>
          <Control spec={{ for: 'any', kind: 'buttons', title: q.topic, buttons: [{ id: 'go', label: 'Kreni!' }] }} onSubmit={() => setStarted(true)}>
            <Button big onClick={() => setStarted(true)} autoFocus>
              Kreni!
            </Button>
          </Control>
        </div>
      ) : (
        <>
          <Timer key={said.length} seconds={turnSeconds} running onEnd={() => lose('isteklo je vrijeme')} />
          {warn && <div className="msg msg-bad">{warn}</div>}
          <Control
            spec={{
              for: turn,
              kind: 'text',
              title: `Tvoj red: ${q.topic}`,
              note: warn || 'Izgovori odgovor naglas. Upis je neobavezan – služi za provjeru ponavljanja.',
              placeholder: 'Odgovor (neobavezno)',
              submitLabel: '✓ Rekao/la sam',
              allowEmpty: true,
              buttons: [{ id: 'dunno', label: '✕ Ne znam', variant: 'bad' }],
            }}
            onSubmit={(v) => (v.button === 'dunno' ? lose('ne može se sjetiti odgovora') : accept(v.text || ''))}
          >
            <form
              className="guess-form"
              onSubmit={(e) => {
                e.preventDefault();
                accept(input);
              }}
            >
              <input
                className="big-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Upiši odgovor (neobavezno – za provjeru ponavljanja)"
                autoComplete="off"
                aria-label="Odgovor"
              />
              <div className="row center">
                <Button big variant="good" type="submit">
                  ✓ Valjan odgovor
                </Button>
                <Button big variant="bad" onClick={() => lose('ne može se sjetiti odgovora')}>
                  ✕ Ne zna
                </Button>
                <Button variant="secondary" onClick={() => lose('ponovio/la je odgovor')}>
                  Ponovljeno
                </Button>
                <Button variant="secondary" onClick={() => lose('odgovor nije valjan')}>
                  Nevaljano
                </Button>
              </div>
            </form>
          </Control>
          <Control
            spec={{
              for: opp,
              kind: 'buttons',
              title: `${players[turn]} odgovara: ${q.topic}`,
              note: 'Ako je odgovor ponovljen ili nije valjan, prijavi ga.',
              buttons: [
                { id: 'repeat', label: 'Ponovljeno', variant: 'secondary' },
                { id: 'invalid', label: 'Nevaljano', variant: 'secondary' },
              ],
            }}
            onSubmit={(v) => lose(v.button === 'repeat' ? 'ponovio/la je odgovor' : 'odgovor nije valjan')}
            silent
          />
          {said.length > 0 && (
            <div className="said">
              <span className="muted">Izgovoreno ({said.length}): </span>
              {said.join(' · ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
