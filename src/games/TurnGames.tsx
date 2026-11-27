import { useRef, useState } from 'react';
import type { GameProps } from './types';
import type { Outcome, PlayerIndex } from '../core/types';
import { POINTS, answerMatches, normalize, orderPoints } from '../core/scoring';
import { shuffle } from '../core/engine';
import { sfx } from '../core/sound';
import {
  AnswerTimer,
  Button,
  Explanation,
  NextButton,
  PlayerTag,
  QuestionCard,
  ResultBanner,
  SecretSequence,
  TurnBanner,
  useAnswerTime,
  useSettings,
  pointsLine,
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
  removed = [],
}: {
  removed?: number[];
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
  const seconds = useAnswerTime();
  const timer = seconds ? { timer: seconds } : {};
  const [first, setFirst] = useState<number | null>(null);
  const [steal, setSteal] = useState<number | null | 'declined'>(null);
  const { speedBonus: speedOn } = useSettings();
  const startedAt = useRef(performance.now());
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const fastLimit = seconds ? seconds / 3 : 5;
  const phase = first === null ? 'answer' : first === correct ? 'done' : steal === null ? 'steal' : 'done';

  const pickFirst = (i: number) => {
    setAnswerTime((performance.now() - startedAt.current) / 1000);
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
    if (first === correct && speedOn && answerTime !== null && answerTime <= fastLimit) points[active] += POINTS.speed;
    else if (typeof steal === 'number') {
      outcome[other] = steal === correct ? 'correct' : 'wrong';
      if (steal === correct) points[other] = POINTS.steal;
    }
  }

  const optClass = (i: number) => {
    if (phase !== 'done' && removed.includes(i)) return 'choice removed';
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
          disabled={!clickable || phase === 'done' || removed.includes(i) || (phase === 'steal' && i === first)}
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
      {phase === 'answer' && <AnswerTimer key="a" onEnd={() => pickFirst(-1)} />}
      {phase === 'steal' && <AnswerTimer key="s" onEnd={() => setSteal('declined')} />}
      {first === -1 && <div className="msg msg-bad">⌛ {players[active]} nije odgovorio/la na vrijeme.</div>}
      {phase === 'answer' && (
        <Control
          spec={{ for: active, kind: 'choice', title: text, options, disabled: removed, ...timer }}
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
            disabled: [...removed, ...(first === null || first < 0 ? [] : [first])],
            ...timer,
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
          {first === correct && speedOn && answerTime !== null && answerTime <= fastLimit && (
            <div className="speed-note">
              ⚡ Brzinski bonus +{POINTS.speed}: točan odgovor za {answerTime.toFixed(1)} s
            </div>
          )}
          <ResultBanner points={points} players={players} multiplier={multiplier} />
          <Explanation explanation={explanation} source={source} />
          <NextButton readText={explanation} phone={[`Točno: ${options[correct]}`, pointsLine(points, players, multiplier)]} onClick={() => onDone({ points, outcome })} />
        </>
      )}
    </div>
  );
}

export function Quiz({ question: q, active, players, multiplier, onDone, removed }: GameProps<'quiz'>) {
  return (
    <OptionsWithSteal
      removed={removed}
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

export function OddOne({ question: q, active, players, multiplier, onDone, removed }: GameProps<'oddone'>) {
  return (
    <OptionsWithSteal
      removed={removed}
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
  const seconds = useAnswerTime();
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
          <AnswerTimer onEnd={() => lock(arr)} />
          <Control
            spec={{ for: active, kind: 'order', title: q.prompt, items: arr.map((i) => q.items[i]), ...(seconds ? { timer: seconds } : {}) }}
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
          <NextButton
            readText={q.explanation}
            phone={[`${res.correctPositions} od ${arr.length} na točnom mjestu`, ...q.items.map((t, i) => `${i + 1}. ${t}${q.values ? ` (${q.values[i]})` : ''}`), pointsLine(points, players, multiplier)]}
            onClick={() => onDone({ points, outcome })}
          />
        </>
      )}
    </div>
  );
}

// ---------------- Nabroji tri ----------------

export function List3({ question: q, active, players, multiplier, onDone }: GameProps<'list3'>) {
  const seconds = useAnswerTime();
  const other = otherOf(active);
  const count = q.count ?? 3;
  const [answers, setAnswers] = useState<string[] | null>(null);
  const [inputs, setInputs] = useState<string[]>(() => Array(count).fill(''));
  const [valid, setValid] = useState<number | null>(null);
  const known = (a: string) => !!q.examples?.length && answerMatches(a, q.examples);

  const submit = (list: string[]) => {
    if (answers !== null) return;
    const clean = [...new Set(list.map((s) => s.trim()).filter(Boolean))].slice(0, count);
    setAnswers(clean);
    if (clean.length === 0) {
      setValid(0);
      sfx.wrong();
    } else if (clean.every(known)) {
      setValid(clean.length);
      sfx.correct();
    }
  };
  const judge = (n: number) => {
    setValid(n);
    if (n > 0) sfx.correct();
    else sfx.wrong();
  };

  const knownCount = answers ? answers.filter(known).length : 0;
  const points: [number, number] = [0, 0];
  points[active] = (valid ?? 0) * POINTS.list3PerItem;
  const outcome: [Outcome, Outcome] = [null, null];
  outcome[active] = (valid ?? 0) >= count ? 'correct' : (valid ?? 0) > 0 ? 'partial' : 'wrong';
  const lines = answers?.map((a) => `${known(a) ? '✓' : '?'} ${a}`);
  const judgeButtons = Array.from({ length: (answers?.length ?? 0) - knownCount + 1 }, (_, k) => knownCount + k);

  return (
    <div className="game">
      {answers === null && <TurnBanner p={active} name={players[active]} />}
      <QuestionCard label="Nabroji tri" text={q.prompt} />
      {answers === null && (
        <>
          <AnswerTimer onEnd={() => submit(inputs)} />
          <Control
            spec={{
              for: active,
              kind: 'text',
              title: q.prompt,
              note: `Upiši ${count} odgovora – svaki u svoje polje.`,
              multi: count,
              placeholder: 'odgovor',
              submitLabel: 'Pošalji odgovore',
              allowEmpty: true,
              ...(seconds ? { timer: seconds } : {}),
            }}
            onSubmit={(v) => submit((v.text || '').split('\n'))}
          >
            <form
              className="guess-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit(inputs);
              }}
            >
              {inputs.map((v, i) => (
                <input
                  key={i}
                  className="big-input"
                  value={v}
                  autoComplete="off"
                  placeholder={`${i + 1}. odgovor`}
                  aria-label={`${i + 1}. odgovor`}
                  onChange={(e) => setInputs(inputs.map((x, k) => (k === i ? e.target.value : x)))}
                />
              ))}
              <Button type="submit" big>
                Pošalji odgovore
              </Button>
            </form>
          </Control>
        </>
      )}
      {answers !== null && (
        <ul className="typed-list">
          {answers.length === 0 && <li className="muted">⌛ Bez odgovora</li>}
          {answers.map((a) => (
            <li key={a} className={known(a) ? 'known' : ''}>
              <span>{known(a) ? '✓' : '?'}</span> {a}
            </li>
          ))}
        </ul>
      )}
      {answers !== null && valid === null && (
        <div className="center stack">
          <div className="judge-q">
            <PlayerTag p={other} name={players[other]} />, koliko je odgovora valjano? <span className="muted small">(✓ su već priznati)</span>
          </div>
          <Control
            spec={{
              for: other,
              kind: 'buttons',
              role: 'judge',
              title: `Koliko je valjanih odgovora upisao/la ${players[active]}?`,
              lines,
              buttons: judgeButtons.map((n) => ({ id: String(n), label: String(n), variant: n === 0 ? 'bad' : 'secondary' })),
            }}
            onSubmit={(v) => judge(Number(v.button) || 0)}
          >
            <div className="row center">
              {judgeButtons.map((n) => (
                <Button key={n} big variant={n === 0 ? 'bad' : 'secondary'} onClick={() => judge(n)}>
                  {n}
                </Button>
              ))}
            </div>
          </Control>
        </div>
      )}
      {valid !== null && (
        <>
          <ResultBanner points={points} players={players} multiplier={multiplier} title={`Valjanih odgovora: ${valid}`} />
          {q.examples?.length ? <div className="explain muted">Još mogućih odgovora: {q.examples.join(', ')}</div> : null}
          <NextButton phone={[`Valjanih odgovora: ${valid}`, ...(lines ?? []), pointsLine(points, players, multiplier)]} onClick={() => onDone({ points, outcome })} />
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
  // Pitanje o konkretnoj osobi s unaprijed upisanim odgovorom – bez tajnog unosa.
  const personal = !!(q.about && q.answer);
  const [secret, setSecret] = useState<string | null>(personal ? q.answer! : null);
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

  const card = (
    <QuestionCard
      label={personal ? `Koliko me poznaješ? · ${players[subject]} je ovo unaprijed odgovorio/la` : `Koliko me poznaješ? · pitanje za: ${players[subject]}`}
      text={q.question}
    />
  );

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
            {personal ? `Odgovor je upisan unaprijed.` : `${players[subject]} je zaključao/la odgovor.`} {players[guesser]}, reci naglas što misliš da je odgovor.
          </div>
          <AnswerTimer onEnd={() => setRevealed(true)} />
          <Control
            spec={{ for: 'any', kind: 'buttons', title: q.question, note: `${players[guesser]} pogađa naglas`, buttons: [{ id: 'reveal', label: 'Otkrij odgovor' }] }}
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
                spec={{ for: 'any', kind: 'buttons', title: `${players[subject]}: „${secret}”`, note: 'Je li pogodak točan?', buttons: verdictButtons }}
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
              <NextButton phone={[`${players[subject]}: „${secret}”`, pointsLine(points, players, multiplier)]} onClick={() => onDone({ points, outcome })} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Kategorijski dvoboj ----------------

export function Category({ question: q, active, players, multiplier, onDone }: GameProps<'category'>) {
  const seconds = useAnswerTime();
  const [turn, setTurn] = useState<PlayerIndex>(active);
  const [said, setSaid] = useState<{ p: PlayerIndex; text: string; known: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [warn, setWarn] = useState('');
  const [loser, setLoser] = useState<PlayerIndex | null>(null);
  const [reason, setReason] = useState('');
  const known = (t: string) => !!q.examples?.length && answerMatches(t, q.examples);
  const same = (a: string, b: string) => normalize(a) === normalize(b) || (answerMatches(a, [b]) && answerMatches(b, [a]));
  const last = said[said.length - 1];
  const canReject = !!last && !last.known && last.p !== turn;

  const submit = (raw: string) => {
    const t = raw.trim();
    if (!t || loser !== null) return;
    if (said.some((s) => same(s.text, t))) {
      setWarn(`„${t}” je već upisano – upiši nešto drugo.`);
      sfx.wrong();
      return;
    }
    setWarn('');
    setInput('');
    setSaid((s) => [...s, { p: turn, text: t, known: known(t) }]);
    setTurn(otherOf(turn));
    sfx.reveal();
  };
  const lose = (p: PlayerIndex, why: string) => {
    if (loser !== null) return;
    setLoser(p);
    setReason(why);
    sfx.wrong();
  };
  const reject = () => last && lose(last.p, `„${last.text}” nije valjan pojam`);

  if (loser !== null) {
    const winner = otherOf(loser);
    const points: [number, number] = [0, 0];
    points[winner] = POINTS.categoryWin;
    const outcome: [Outcome, Outcome] = [null, null];
    outcome[winner] = 'correct';
    outcome[loser] = 'wrong';
    const title = `${players[loser]}: ${reason}. Pobjeđuje ${players[winner]}!`;
    return (
      <div className="game">
        <QuestionCard label="Kategorijski dvoboj" text={q.topic} />
        <SaidList said={said} players={players} />
        <ResultBanner points={points} players={players} multiplier={multiplier} title={title} />
        {q.examples?.length ? <div className="explain muted">Još neki primjeri: {q.examples.join(', ')}</div> : null}
        <NextButton phone={[title, pointsLine(points, players, multiplier)]} onClick={() => onDone({ points, outcome })} />
      </div>
    );
  }

  const buttons = [
    { id: 'dunno', label: 'Ne znam više – odustajem', variant: 'bad' as const },
    ...(canReject ? [{ id: 'reject', label: `Odbij „${last!.text}” (nije valjano)`, variant: 'secondary' as const }] : []),
  ];

  return (
    <div className="game">
      <TurnBanner p={turn} name={players[turn]}> · upiši jedan pojam</TurnBanner>
      <QuestionCard label="Kategorijski dvoboj · naizmjence upisujte po jedan pojam" text={q.topic} />
      <AnswerTimer key={said.length} onEnd={() => lose(turn, 'isteklo je vrijeme')} />
      {warn && <div className="msg msg-bad">{warn}</div>}
      <Control
        spec={{
          for: turn,
          kind: 'text',
          title: `Tvoj red – ${q.topic}`,
          note: warn || 'Upiši JEDAN pojam iz kategorije koji još nije upisan.',
          placeholder: 'Jedan pojam',
          submitLabel: 'Pošalji',
          ...(seconds ? { timer: seconds } : {}),
          lines: said.length ? [`Već upisano: ${said.map((s) => s.text).join(', ')}`] : undefined,
          buttons,
        }}
        onSubmit={(v) => (v.button === 'dunno' ? lose(turn, 'odustao/la je') : v.button === 'reject' ? reject() : submit(v.text || ''))}
      >
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            className="big-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`${players[turn]}: upiši jedan pojam`}
            autoComplete="off"
            aria-label="Pojam"
          />
          <div className="row center">
            <Button type="submit" disabled={!input.trim()}>
              Pošalji
            </Button>
            <Button variant="bad" onClick={() => lose(turn, 'odustao/la je')}>
              Ne znam više
            </Button>
            {canReject && (
              <Button variant="secondary" onClick={reject}>
                Odbij „{last!.text}”
              </Button>
            )}
          </div>
        </form>
      </Control>
      <SaidList said={said} players={players} />
    </div>
  );
}

function SaidList({ said, players }: { said: { p: PlayerIndex; text: string; known: boolean }[]; players: [string, string] }) {
  if (!said.length) return null;
  return (
    <div className="guess-log">
      {said.map((s, i) => (
        <span key={i} className={`log-item ${s.known ? 'hit' : ''}`} title={s.known ? 'Poznat pojam' : 'Nepoznat pojam – protivnik ga može odbiti'}>
          <strong className={`p${s.p}-text`}>{players[s.p]}:</strong> {s.text} {s.known ? '✓' : '?'}
        </span>
      ))}
    </div>
  );
}
