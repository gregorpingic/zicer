import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { GameType, JokerKind, MatchState, PlayerIndex, Question, QuestionOutcome } from '../core/types';
import { GAME_COMPONENTS } from '../games';
import type { GameProps } from '../games/types';
import { MODE_NAMES, ROUND_INFO, SIMULTANEOUS, questionText } from '../core/gameInfo';
import * as engine from '../core/engine';
import { addMatchRecord, saveMatch } from '../db/db';
import { sfx } from '../core/sound';
import { stopSpeaking } from '../core/speech';
import { summarizeMatch } from '../core/stats';
import { AutoAdvance, Button, Confirm, Modal, PauseContext, QuestionTypeContext, parseNumber, readingTime, useSettings } from '../components/common';
import { reportQuestion } from '../db/sync';
import type { JokerView } from '../remote/protocol';

export const JOKERS: { kind: JokerKind; icon: string; label: string; help: string }[] = [
  { kind: 'fifty', icon: '½', label: '50:50', help: 'Uklanja dva netočna odgovora (Kviz i Uljez, kad si na potezu)' },
  { kind: 'double', icon: '×2', label: 'Dupli bodovi', help: 'Udvostručuje tvoje bodove na ovom pitanju' },
  { kind: 'steal', icon: '⇄', label: 'Ukradi potez', help: 'Preuzimaš pitanje na kojem je protivnik – kreće ispočetka s tobom' },
];

export const REPORT_REASONS = ['Netočan odgovor', 'Nejasno pitanje', 'Glupo ili dosadno', 'Ponavlja se', 'Zastarjelo'];

function jokerViews(state: MatchState): [JokerView, JokerView] | undefined {
  if (!state.jokers) return undefined;
  return ([0, 1] as const).map((p) =>
    Object.fromEntries(
      JOKERS.map((j) => [j.kind, !state.jokers![p][j.kind] ? 'used' : engine.canUseJoker(state, p, j.kind) ? 'ok' : 'na']),
    ),
  ) as [JokerView, JokerView];
}

/** Džokeri oba igrača; aktivni se mogu kliknuti na ovom ekranu (ili s mobitela). */
function JokerBar({ state, onUse }: { state: MatchState; onUse: (p: PlayerIndex, k: JokerKind) => void }) {
  const views = jokerViews(state);
  if (!views) return null;
  return (
    <div className="joker-bar">
      {([0, 1] as const).map((p) => (
        <div key={p} className={`joker-group p${p}`}>
          <span className="joker-name">{state.players[p]}</span>
          {JOKERS.map((j) => (
            <button
              key={j.kind}
              className={`joker ${views[p][j.kind]}`}
              disabled={views[p][j.kind] !== 'ok'}
              title={`${j.label} – ${j.help}`}
              aria-label={`${state.players[p]}: ${j.label}`}
              onClick={() => onUse(p, j.kind)}
            >
              {j.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReportModal({ question, onSend, onClose }: { question: Question; onSend: (reason: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  return (
    <Modal title="Prijavi pitanje" onClose={onClose}>
      <p className="muted small">„{questionText(question)}”</p>
      <div className="row">
        {REPORT_REASONS.map((r) => (
          <Button key={r} variant="secondary" onClick={() => onSend(text ? `${r}: ${text}` : r)}>
            {r}
          </Button>
        ))}
      </div>
      <textarea className="json-area report-text" placeholder="Neobavezno: što točno ne valja?" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row end">
        <Button variant="ghost" onClick={onClose}>
          Odustani
        </Button>
        <Button onClick={() => onSend(text || 'Prijavljeno')} disabled={!text.trim()}>
          Pošalji
        </Button>
      </div>
    </Modal>
  );
}
import { Control, useHub } from '../remote/RemoteContext';
import TvZoomButtons from '../remote/TvZoomButtons';

function ScoreBoard({ state, highlight }: { state: MatchState; highlight: PlayerIndex | null }) {
  const prev = useRef(state.scores);
  const [pops, setPops] = useState<[{ v: number; k: number } | null, { v: number; k: number } | null]>([null, null]);
  useEffect(() => {
    const d0 = state.scores[0] - prev.current[0];
    const d1 = state.scores[1] - prev.current[1];
    prev.current = state.scores;
    if (d0 || d1) {
      const k = Date.now();
      setPops([d0 ? { v: d0, k } : null, d1 ? { v: d1, k } : null]);
      const t = setTimeout(() => setPops([null, null]), 1800);
      return () => clearTimeout(t);
    }
  }, [state.scores]);

  const round = state.config.rounds[state.roundIndex];
  const leader = state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
  return (
    <header className="scoreboard">
      {([0, 1] as const).map((p) => (
        <div key={p} className={`sb-player p${p} ${highlight === p ? 'active' : ''} ${p === 1 ? 'right' : ''}`}>
          <div className="sb-name">
            {state.players[p]}
            {leader === p && <span className="sb-lead" title="Vodi">▲</span>}
          </div>
          <div className="sb-score" key={state.scores[p]}>
            {state.scores[p]}
          </div>
          {pops[p] && (
            <div key={pops[p]!.k} className={`sb-pop ${pops[p]!.v > 0 ? 'pos' : 'neg'}`}>
              {pops[p]!.v > 0 ? `+${pops[p]!.v}` : pops[p]!.v}
            </div>
          )}
        </div>
      ))}
      <div className="sb-mid">
        {state.phase === 'tiebreak' ? (
          <div className="sb-round">Dodatno pitanje</div>
        ) : state.phase === 'finished' ? (
          <div className="sb-round">Kraj dvoboja</div>
        ) : (
          <>
            <div className="sb-round">
              Runda {state.roundIndex + 1}/{state.config.rounds.length}
            </div>
            <div className="sb-type">
              {(round === 'mix' || round === 'finale') && state.current && state.phase === 'question'
                ? ROUND_INFO[state.current.question.type].name
                : ROUND_INFO[round].name}
            </div>
            {state.phase === 'question' && (
              <div className="sb-q">
                Pitanje {state.questionIndex + 1}/{state.config.questionsPerRound}
                {state.current && state.current.multiplier > 1 && <span className="mult">×{state.current.multiplier}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function AdjustModal({ state, onApply, onClose }: { state: MatchState; onApply: (p: PlayerIndex, d: number) => void; onClose: () => void }) {
  const [custom, setCustom] = useState<[string, string]>(['', '']);
  return (
    <Modal title="Ručna korekcija bodova" onClose={onClose}>
      <p className="muted">Ako je odgovor pogrešno vrednovan, ispravite bodove. Korekcije se bilježe u povijesti dvoboja.</p>
      {([0, 1] as const).map((p) => (
        <div key={p} className={`adjust-row p${p}`}>
          <div className="adjust-name">
            {state.players[p]} <strong>{state.scores[p]}</strong>
          </div>
          <div className="row">
            {[-10, -5, 5, 10].map((d) => (
              <Button key={d} variant={d < 0 ? 'bad' : 'good'} onClick={() => onApply(p, d)}>
                {d > 0 ? `+${d}` : d}
              </Button>
            ))}
            <input
              className="small-input"
              inputMode="numeric"
              placeholder="±"
              value={custom[p]}
              aria-label={`Proizvoljna korekcija za ${state.players[p]}`}
              onChange={(e) => {
                const c: [string, string] = [...custom];
                c[p] = e.target.value;
                setCustom(c);
              }}
            />
            <Button
              variant="secondary"
              disabled={!parseNumber(custom[p])}
              onClick={() => {
                const n = parseNumber(custom[p]);
                if (n) onApply(p, Math.round(n));
                const c: [string, string] = [...custom];
                c[p] = '';
                setCustom(c);
              }}
            >
              Primijeni
            </Button>
          </div>
        </div>
      ))}
      {state.adjustments.length > 0 && (
        <div className="muted small">
          Dosadašnje korekcije:{' '}
          {state.adjustments.map((a) => `${state.players[a.player]} ${a.delta > 0 ? '+' : ''}${a.delta}`).join(', ')}
        </div>
      )}
      <div className="row end">
        <Button onClick={onClose}>Gotovo</Button>
      </div>
    </Modal>
  );
}

function RoundIntro({ state, onStart }: { state: MatchState; onStart: () => void }) {
  const kind = state.config.rounds[state.roundIndex];
  const info = ROUND_INFO[kind];
  const started = useRef(false);
  const start = () => {
    if (started.current) return;
    started.current = true;
    onStart();
  };
  const trailing = state.scores[0] === state.scores[1] ? null : state.scores[0] < state.scores[1] ? 0 : 1;
  return (
    <div className="panel intro">
      <div className="intro-kicker">
        Runda {state.roundIndex + 1} od {state.config.rounds.length}
      </div>
      <h1 className="intro-title">{info.name}</h1>
      <p className="intro-short">{info.short}</p>
      <ul className="rules">
        {info.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {kind === 'finale' && trailing !== null && (
        <p className="intro-note">
          Zaostaje <strong>{state.players[trailing]}</strong> – prvi/a je na potezu. Razlika: {Math.abs(state.scores[0] - state.scores[1])}.
        </p>
      )}
      <p className="muted">Pitanja u rundi: {state.config.questionsPerRound}</p>
      <Control
        spec={{ for: 'any', kind: 'buttons', title: `Runda ${state.roundIndex + 1}: ${info.name}`, note: info.short, buttons: [{ id: 'start', label: 'Započni rundu' }] }}
        onSubmit={start}
      >
        <Button big onClick={start} autoFocus>
          Započni rundu
        </Button>
      </Control>
      <AutoAdvance seconds={readingTime(info.rules.join(' '), 5)} onEnd={start} />
    </div>
  );
}

function RoundSummary({ state, onNext }: { state: MatchState; onNext: () => void }) {
  const results = state.results.filter((r) => r.roundIndex === state.roundIndex);
  const gained: [number, number] = [0, 0];
  results.forEach((r) => {
    gained[0] += r.points[0];
    gained[1] += r.points[1];
  });
  const last = state.roundIndex + 1 >= state.config.rounds.length;
  const went = useRef(false);
  const next = () => {
    if (went.current) return;
    went.current = true;
    onNext();
  };
  return (
    <div className="panel intro">
      <div className="intro-kicker">Kraj runde {state.roundIndex + 1}</div>
      <h1 className="intro-title">{ROUND_INFO[state.config.rounds[state.roundIndex]].name}</h1>
      {results.length === 0 && <p className="msg msg-info">Za ovu vrstu igre nema pitanja u bazi – runda je preskočena.</p>}
      <div className="summary-grid">
        {([0, 1] as const).map((p) => (
          <div key={p} className={`summary-box p${p}`}>
            <div className="answer-name">{state.players[p]}</div>
            <div className="summary-gain">{gained[p] >= 0 ? `+${gained[p]}` : gained[p]}</div>
            <div className="muted">ukupno {state.scores[p]}</div>
          </div>
        ))}
      </div>
      <Control
        spec={{ for: 'any', kind: 'buttons', title: `Kraj runde ${state.roundIndex + 1}`, buttons: [{ id: 'next', label: last ? 'Proglasi pobjednika' : 'Sljedeća runda' }] }}
        onSubmit={next}
      >
        <Button big onClick={next} autoFocus>
          {last ? 'Proglasi pobjednika' : 'Sljedeća runda'}
        </Button>
      </Control>
      <AutoAdvance seconds={6} onEnd={next} />
    </div>
  );
}

function EndScreen({ state, onRematch, onHome }: { state: MatchState; onRematch: () => void; onHome: () => void }) {
  const w = state.winner ?? 0;
  const s = summarizeMatch(state.results, state.config.rounds.length);
  const minutes = Math.max(1, Math.round(((state.finishedAt || Date.now()) - state.startedAt) / 60000));
  const bestRound = ([0, 1] as const).map((p) => Math.max(0, ...s.perRound.map((r) => r[p])));
  return (
    <div className="panel end">
      <div className="intro-kicker">{MODE_NAMES[state.config.mode]} · {minutes} min</div>
      <div className={`winner p${w}`}>
        <div className="winner-label">Pobjednik dvoboja</div>
        <div className="winner-name">{state.players[w]}</div>
        <div className="winner-score">
          {state.scores[0]} : {state.scores[1]}
        </div>
        {state.tiebreaks > 0 && (
          <div className="muted">
            {state.scores[0] === state.scores[1] ? 'Odlučeno brojem točnih odgovora' : 'Odlučeno dodatnim pitanjem'}
          </div>
        )}
      </div>
      <table className="stats-table">
        <thead>
          <tr>
            <th />
            <th className="p0">{state.players[0]}</th>
            <th className="p1">{state.players[1]}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Točni odgovori</td>
            <td>
              {s.correct[0]}/{s.attempts[0]}
            </td>
            <td>
              {s.correct[1]}/{s.attempts[1]}
            </td>
          </tr>
          <tr>
            <td>Najbolja runda</td>
            <td>{bestRound[0]}</td>
            <td>{bestRound[1]}</td>
          </tr>
          {state.config.rounds.map((r, i) => (
            <tr key={i}>
              <td>
                {i + 1}. {ROUND_INFO[r].name}
              </td>
              <td>{s.perRound[i][0]}</td>
              <td>{s.perRound[i][1]}</td>
            </tr>
          ))}
          {state.adjustments.length > 0 && (
            <tr>
              <td>Ručne korekcije</td>
              {([0, 1] as const).map((p) => (
                <td key={p}>{state.adjustments.filter((a) => a.player === p).reduce((x, a) => x + a.delta, 0)}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      <Control
        spec={{
          for: 'any',
          kind: 'buttons',
          title: `Pobjednik: ${state.players[w]} (${state.scores[0]} : ${state.scores[1]})`,
          buttons: [
            { id: 'rematch', label: 'Revanš' },
            { id: 'home', label: 'Novi dvoboj', variant: 'secondary' },
          ],
        }}
        onSubmit={(v) => (v.button === 'rematch' ? onRematch() : onHome())}
      >
        <div className="row center">
          <Button big onClick={onRematch} autoFocus>
            Revanš
          </Button>
          <Button big variant="secondary" onClick={onHome}>
            Početni zaslon
          </Button>
        </div>
      </Control>
    </div>
  );
}

export default function GameScreen({
  initial,
  onExit,
  onRematch,
}: {
  initial: MatchState;
  onExit: () => void;
  onRematch: (s: MatchState) => void;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [confirm, setConfirm] = useState<'exit' | 'skip' | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const busyRef = useRef(false);

  const commit = async (next: MatchState) => {
    setState(next);
    if (next.phase === 'finished') {
      await addMatchRecord(engine.toRecord(next));
      await saveMatch(null);
      sfx.win();
    } else await saveMatch(next);
  };

  const run = async (fn: (s: MatchState) => Promise<MatchState> | MatchState) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    stopSpeaking();
    try {
      await commit(await fn(stateRef.current));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Ako je igra nastavljena usred pitanja, a pitanje nije učitano, učitaj ga.
  useEffect(() => {
    if (state.phase === 'question' && !state.current) void run((s) => engine.enterQuestion(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.target as HTMLElement).tagName !== 'INPUT') setPaused((x) => !x);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Način s mobitelima: naredbe s mobitela i podaci za njihovo zaglavlje.
  const { host, bot } = useHub();
  const settings = useSettings();
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 3000);
  };
  /** Džoker: odmah mijenja stanje (bez čekanja), uz kratku obavijest. */
  const useJokerFor = (p: PlayerIndex, kind: JokerKind) => {
    const before = stateRef.current;
    const after = engine.useJoker(before, p, kind);
    if (after === before) return;
    sfx.reveal();
    void commit(after);
    showToast(`${before.players[p]} koristi džoker: ${JOKERS.find((j) => j.kind === kind)!.label}!`);
  };
  const sendReport = (reason: string, p: PlayerIndex | null) => {
    const q = stateRef.current.current?.question;
    if (!q) return;
    void reportQuestion({
      question_id: q.id,
      pack_id: q.packId ?? null,
      text: questionText(q),
      reason,
      by_name: p === null ? '' : stateRef.current.players[p],
    });
    setReportOpen(false);
    showToast('Pitanje je prijavljeno – hvala! Pregledat ćemo ga u „Pitanja i paketi”.');
  };

  // Računalo mora znati koje je pitanje na redu (za svoje odgovore).
  bot?.setQuestion(state.current?.question ?? null);
  useEffect(() => {
    if (!host) return;
    return host.onCommand((c, from) => {
      if (c.cmd === 'joker') useJokerFor(from, c.kind);
      else if (c.cmd === 'report') sendReport(c.reason, from);
      else if (c.cmd === 'pause') setPaused(true);
      else if (c.cmd === 'resume') setPaused(false);
      else if (c.cmd === 'skip') {
        const s = stateRef.current;
        if ((s.phase === 'question' || s.phase === 'tiebreak') && s.current) void run(engine.skipQuestion);
      } else if (c.cmd === 'adjust') void commit(engine.adjustScore(stateRef.current, c.player, c.delta));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);
  useEffect(() => {
    if (!host) return;
    const round = state.config.rounds[state.roundIndex];
    host.setInfo({
      players: state.players,
      scores: state.scores,
      paused,
      inGame: state.phase !== 'finished',
      title:
        state.phase === 'tiebreak'
          ? 'Dodatno pitanje'
          : state.phase === 'finished'
            ? 'Kraj dvoboja'
            : `Runda ${state.roundIndex + 1}/${state.config.rounds.length} · ${ROUND_INFO[round].name}`,
      subtitle: state.phase === 'question' ? `Pitanje ${state.questionIndex + 1}/${state.config.questionsPerRound}` : undefined,
      question: state.current ? questionText(state.current.question) : undefined,
      turn:
        state.current && !SIMULTANEOUS.includes(state.current.question.type) ? `Na potezu: ${state.players[state.current.active]}` : undefined,
      jokers: settings.jokers ? jokerViews(state) : undefined,
      canReport: !!state.current,
    });
  }, [host, state, paused, settings.jokers]);

  const cur = state.current;
  const inQuestion = (state.phase === 'question' || state.phase === 'tiebreak') && cur;
  const highlight: PlayerIndex | null =
    inQuestion && !SIMULTANEOUS.includes(cur.question.type) ? cur.active : null;

  let content;
  if (state.phase === 'roundIntro') content = <RoundIntro state={state} onStart={() => run(engine.enterQuestion)} />;
  else if (state.phase === 'roundSummary') content = <RoundSummary state={state} onNext={() => run(engine.advanceAfterRound)} />;
  else if (state.phase === 'finished')
    content = <EndScreen state={state} onHome={onExit} onRematch={() => onRematch(state)} />;
  else if (cur) {
    const Comp = GAME_COMPONENTS[cur.question.type] as ComponentType<GameProps<GameType>>;
    content = (
      <>
        {state.phase === 'tiebreak' && (
          <div className="tiebreak-banner">
            Neriješeno! Dodatno pitanje odlučuje pobjednika – bolji odgovor donosi +10.
          </div>
        )}
        {(state.config.rounds[state.roundIndex] === 'mix' || state.config.rounds[state.roundIndex] === 'finale') &&
          state.phase === 'question' && (
            <div className="mix-hint">
              <strong>{ROUND_INFO[cur.question.type].name}</strong> · {ROUND_INFO[cur.question.type].short}
            </div>
          )}
        {cur.recycled && (
          <div className="muted small center">Sva pitanja ove vrste već su odigrana – baza se vrti ispočetka.</div>
        )}
        <QuestionTypeContext.Provider value={cur.question.type}>
        <Comp
          key={`${cur.question.id}-${state.results.length}-${cur.stolen || 0}`}
          question={cur.question}
          active={cur.active}
          removed={cur.removed}
          players={state.players}
          scores={state.scores}
          multiplier={cur.multiplier}
          onDone={(r: QuestionOutcome) => run((s) => engine.completeQuestion(s, r))}
        />
        </QuestionTypeContext.Provider>
      </>
    );
  } else content = <div className="panel center">Učitavanje…</div>;

  return (
    <PauseContext.Provider value={paused}>
      <div className="game-screen">
        <ScoreBoard state={state} highlight={highlight} />
        {state.phase !== 'finished' && (
        <div className="toolbar">
          <Button variant="ghost" onClick={() => setPaused(true)}>
            ⏸ Pauza
          </Button>
          {inQuestion && (
            <Button variant="ghost" onClick={() => setConfirm('skip')}>
              ⏭ Preskoči
            </Button>
          )}
          <Button variant="ghost" onClick={() => setAdjust(true)}>
            ± Bodovi
          </Button>
          {inQuestion && (
            <Button variant="ghost" onClick={() => setReportOpen(true)}>
              ⚑ Prijavi
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirm('exit')}>
            ✕ Izlaz
          </Button>
          {host && <TvZoomButtons />}
        </div>
        )}
        {settings.jokers && state.phase === 'question' && <JokerBar state={state} onUse={useJokerFor} />}
        {toast && <div className="game-toast">{toast}</div>}
        <main className={`stage ${busy ? 'busy' : ''} ${paused ? 'hidden' : ''}`} aria-hidden={paused}>{content}</main>
        {reportOpen && cur && <ReportModal question={cur.question} onClose={() => setReportOpen(false)} onSend={(r) => sendReport(r, null)} />}

        {paused && (
          <div className="pause-overlay">
            <div className="pause-box">
              <div className="pause-title">Pauza</div>
              <div className="muted">Pitanje je skriveno. Mjerači vremena su zaustavljeni.</div>
              <Button big onClick={() => setPaused(false)} autoFocus>
                ▶ Nastavi
              </Button>
            </div>
          </div>
        )}
        {adjust && (
          <AdjustModal
            state={state}
            onClose={() => setAdjust(false)}
            onApply={(p, d) => void commit(engine.adjustScore(stateRef.current, p, d))}
          />
        )}
        {confirm === 'skip' && (
          <Confirm
            title="Preskočiti pitanje?"
            text="Dobit ćete novo pitanje iste vrste. Preskočeno pitanje neće se ponovno pojaviti dok se baza ne iscrpi."
            confirmLabel="Preskoči"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              void run(engine.skipQuestion);
            }}
          />
        )}
        {confirm === 'exit' && (
          <Confirm
            title="Prekinuti dvoboj?"
            text="Igra je spremljena i možete je nastaviti s početnog zaslona. Trenutačno pitanje počet će ispočetka."
            confirmLabel="Izađi"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              stopSpeaking();
              onExit();
            }}
          />
        )}
      </div>
    </PauseContext.Provider>
  );
}
