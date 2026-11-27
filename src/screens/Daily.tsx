import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameType, PlayerIndex, Question, Settings } from '../core/types';
import { ROUND_INFO, questionText } from '../core/gameInfo';
import { allQuestions } from '../db/db';
import { yearPoints } from '../core/scoring';
import { sfx } from '../core/sound';
import { AnswerTimer, Button, Explanation, QuestionCard, QuestionTypeContext, formatNumber, parseNumber } from '../components/common';

// Dnevni izazov: svaki dan istih 5 pitanja za oba igrača (isti odabir na svim uređajima).
// Svatko igra sam, kad stigne; rezultati se spremaju u zajedničku bazu i uspoređuju.

const API = 'https://zicer.lastegg.app/api';
const SEQUENCE: GameType[][] = [['quiz'], ['truefalse'], ['price', 'closest'], ['year'], ['higherlower']];
/** Samo pitanja iz zajedničkih paketa, da odabir bude isti na svim uređajima. */
const STABLE_PACKS = ['zicer-osnovni', 'zicer-kurirani', 'zicer-kurirani-2', 'zicer-cijene'];

export function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' });
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function dailyQuestions(date: string): Promise<Question[]> {
  const all = (await allQuestions()).filter((q) => q.packId && STABLE_PACKS.includes(q.packId));
  const out: Question[] = [];
  for (const types of SEQUENCE) {
    const pool = all.filter((q) => types.includes(q.type) && !out.includes(q)).sort((a, b) => a.id.localeCompare(b.id));
    if (pool.length) out.push(pool[hash(`${date}|${types.join()}`) % pool.length]);
  }
  return out;
}

interface DailyRow {
  date: string;
  player: string;
  score: number;
  detail: { answers: { id: string; given: string; points: number }[] } | null;
}

/** Bodovi 0–10 po pitanju. */
function score(q: Question, given: number | null): number {
  if (given === null) return 0;
  switch (q.type) {
    case 'quiz':
    case 'higherlower':
      return given === q.correct ? 10 : 0;
    case 'truefalse':
      return (given === 0) === q.answer ? 10 : 0;
    case 'year':
      return Math.round(yearPoints(given, q.answer) / 3);
    case 'closest':
    case 'price': {
      const rel = Math.abs(given - q.answer) / Math.max(Math.abs(q.answer), 1e-9);
      return rel <= 0.1 ? 10 : rel <= 0.25 ? 6 : rel <= 0.5 ? 3 : 0;
    }
    default:
      return 0;
  }
}

function correctText(q: Question): string {
  switch (q.type) {
    case 'quiz':
      return q.options[q.correct];
    case 'higherlower':
      return q.options[q.correct];
    case 'truefalse':
      return q.answer ? 'Istina' : 'Laž';
    case 'year':
      return `${q.answer}.`;
    case 'closest':
      return `${formatNumber(q.answer)} ${q.unit ?? ''}`;
    case 'price':
      return `≈ ${formatNumber(q.answer)} €`;
    default:
      return '';
  }
}

function givenText(q: Question, given: number | null): string {
  if (given === null) return '⌛ bez odgovora';
  if (q.type === 'quiz' || q.type === 'higherlower') return q.options[given];
  if (q.type === 'truefalse') return given === 0 ? 'Istina' : 'Laž';
  if (q.type === 'price') return `${formatNumber(given)} €`;
  if (q.type === 'year') return `${given}.`;
  return formatNumber(given);
}

async function fetchRows(): Promise<DailyRow[]> {
  const r = await fetch(`${API}/daily?days=14`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function postRow(row: { date: string; player: string; score: number; detail: unknown }) {
  try {
    const r = await fetch(`${API}/daily`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) });
    if (!r.ok) throw new Error();
  } catch {
    // bez interneta: spremi i pošalji pri sljedećem otvaranju
    const pending = JSON.parse(localStorage.getItem('zicer-daily-pending') || '[]');
    localStorage.setItem('zicer-daily-pending', JSON.stringify([...pending, row]));
  }
}

async function flushPending() {
  const pending = JSON.parse(localStorage.getItem('zicer-daily-pending') || '[]') as unknown[];
  if (!pending.length) return;
  for (const row of pending) await fetch(`${API}/daily`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) });
  localStorage.removeItem('zicer-daily-pending');
}

export function dailyDoneLocally(name: string): boolean {
  return localStorage.getItem(`zicer-daily-${todayKey()}-${name}`) === '1';
}

function Play({ questions, onFinish }: { questions: Question[]; onFinish: (answers: { q: Question; given: number | null; points: number }[]) => void }) {
  const [i, setI] = useState(0);
  const [given, setGiven] = useState<number | null | undefined>(undefined);
  const [text, setText] = useState('');
  const answers = useRef<{ q: Question; given: number | null; points: number }[]>([]);
  const q = questions[i];
  const answered = given !== undefined;
  const pts = answered ? score(q, given) : 0;

  const answer = (v: number | null) => {
    if (answered) return;
    setGiven(v);
    const p = score(q, v);
    answers.current.push({ q, given: v, points: p });
    if (p >= 6) sfx.correct();
    else sfx.wrong();
  };
  const next = () => {
    setGiven(undefined);
    setText('');
    if (i + 1 < questions.length) setI(i + 1);
    else onFinish(answers.current);
  };

  const options =
    q.type === 'quiz' || q.type === 'higherlower' ? q.options : q.type === 'truefalse' ? ['Istina', 'Laž'] : null;
  const label = `${i + 1}/${questions.length} · ${ROUND_INFO[q.type].name}`;
  const qtext = q.type === 'price' ? `Koliko košta: ${q.item}?${q.details ? ` (${q.details})` : ''}` : questionText(q);

  return (
    <QuestionTypeContext.Provider value={q.type}>
      <div className="game">
        <QuestionCard label={label} text={qtext} />
        {!answered && <AnswerTimer key={i} onEnd={() => answer(null)} />}
        {options ? (
          <div className={`choices choices-${options.length}`}>
            {options.map((o, k) => (
              <button
                key={k}
                className={`choice ${answered ? (o === correctText(q) ? 'right' : k === given ? 'wrong' : 'dim') : ''}`}
                disabled={answered}
                onClick={() => answer(k)}
              >
                {o}
              </button>
            ))}
          </div>
        ) : !answered ? (
          <form
            className="guess-form"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseNumber(text);
              if (n !== null) answer(q.type === 'year' ? Math.round(n) : n);
            }}
          >
            <div className="num-row">
              <input className="big-input" inputMode="decimal" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder={q.type === 'year' ? 'Godina' : q.type === 'price' ? 'Cijena u eurima' : 'Tvoja procjena'} autoFocus />
              {q.type === 'price' && <span className="unit">€</span>}
              {q.type === 'closest' && q.unit && <span className="unit">{q.unit}</span>}
            </div>
            <Button type="submit" big disabled={parseNumber(text) === null}>
              Zaključaj odgovor
            </Button>
          </form>
        ) : null}
        {answered && (
          <>
            <div className="solution">
              Točno: <strong>{correctText(q)}</strong> · tvoj odgovor: {givenText(q, given ?? null)}
            </div>
            <div className={`daily-points ${pts >= 6 ? 'good' : ''}`}>+{pts} bodova</div>
            <Explanation explanation={q.explanation} source={q.source} />
            <div className="next-row">
              <Button big onClick={next} autoFocus>
                {i + 1 < questions.length ? 'Dalje →' : 'Završi izazov'}
              </Button>
            </div>
          </>
        )}
      </div>
    </QuestionTypeContext.Provider>
  );
}

export default function Daily({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const date = todayKey();
  const [me, setMe] = useState<string | null>(() => localStorage.getItem('zicer-daily-me'));
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [rows, setRows] = useState<DailyRow[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mine, setMine] = useState<{ score: number; answers: { id: string; given: string; points: number }[] } | null>(null);

  const load = () =>
    flushPending()
      .catch(() => undefined)
      .then(fetchRows)
      .then((r) => {
        setRows(r);
        setOffline(false);
      })
      .catch(() => setOffline(true));

  useEffect(() => {
    void dailyQuestions(date).then(setQuestions);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayRows = useMemo(() => (rows || []).filter((r) => r.date === date), [rows, date]);
  const myRow = todayRows.find((r) => r.player === me);
  const done = !!myRow || !!mine || (me ? dailyDoneLocally(me) : false);
  const players = settings.players;

  // Ukupni omjer pobjeda u dnevnim izazovima (zadnjih 14 dana).
  const tally = useMemo(() => {
    const byDate = new Map<string, DailyRow[]>();
    for (const r of rows || []) byDate.set(r.date, [...(byDate.get(r.date) || []), r]);
    const wins: Record<string, number> = {};
    for (const [d, rs] of byDate) {
      if (d === date && rs.length < 2) continue;
      const both = rs.filter((r) => players.includes(r.player));
      if (both.length < 2) continue;
      const max = Math.max(...both.map((r) => r.score));
      const top = both.filter((r) => r.score === max);
      if (top.length === 1) wins[top[0].player] = (wins[top[0].player] || 0) + 1;
    }
    return wins;
  }, [rows, date, players]);

  if (!me)
    return (
      <div className="page">
        <div className="page-head">
          <Button variant="ghost" onClick={onBack}>
            ← Natrag
          </Button>
          <h1>Dnevni izazov</h1>
        </div>
        <section className="card center">
          <h2>Tko igra na ovom uređaju?</h2>
          <div className="row center">
            {players.map((n, p) => (
              <Button
                key={n}
                big
                variant="secondary"
                className={`p${p as PlayerIndex}`}
                onClick={() => {
                  localStorage.setItem('zicer-daily-me', n);
                  setMe(n);
                }}
              >
                {n}
              </Button>
            ))}
          </div>
        </section>
      </div>
    );

  if (playing && questions)
    return (
      <div className="page">
        <div className="page-head">
          <h1>Dnevni izazov · {me}</h1>
        </div>
        <Play
          questions={questions}
          onFinish={(ans) => {
            const total = ans.reduce((s, a) => s + a.points, 0);
            const detail = { answers: ans.map((a) => ({ id: a.q.id, given: givenText(a.q, a.given), points: a.points })) };
            localStorage.setItem(`zicer-daily-${date}-${me}`, '1');
            setMine({ score: total, ...detail });
            setPlaying(false);
            void postRow({ date, player: me, score: total, detail }).then(load);
          }}
        />
      </div>
    );

  const other = players.find((n) => n !== me) || '';
  const otherRow = todayRows.find((r) => r.player === other);
  const myScore = myRow?.score ?? mine?.score;
  const myAnswers = myRow?.detail?.answers ?? mine?.answers;

  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Dnevni izazov</h1>
      </div>
      <section className="card center">
        <div className="intro-kicker">{new Date().toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <p>
          Svaki dan istih 5 pitanja za oboje – svatko igra sam, kad stigne. Do 10 bodova po pitanju.
        </p>
        {!done ? (
          <Button big onClick={() => setPlaying(true)} disabled={!questions?.length} autoFocus>
            ▶ Igraj ({me})
          </Button>
        ) : (
          <div className="daily-score">
            Tvoj rezultat danas: <strong>{myScore ?? '…'}</strong> / 50
          </div>
        )}
        <div className="muted small">
          Igraš kao {me} ·{' '}
          <button className="link-btn" onClick={() => setMe(null)}>
            promijeni
          </button>
        </div>
      </section>

      {done && (
        <section className="card">
          <h2>Današnji dvoboj</h2>
          {offline && <div className="msg msg-info">Bez interneta – rezultati će se usporediti kad se povežeš.</div>}
          <div className="summary-grid">
            {[me, other].map((n) => {
              const row = n === me ? { score: myScore, answers: myAnswers } : otherRow ? { score: otherRow.score, answers: otherRow.detail?.answers } : null;
              const p = (players.indexOf(n) === 1 ? 1 : 0) as PlayerIndex;
              return (
                <div key={n} className={`summary-box p${p}`}>
                  <div className="answer-name">{n}</div>
                  <div className="summary-gain">{row?.score ?? '–'}</div>
                  <div className="muted small">{row ? 'od 50' : 'još nije igrao/la'}</div>
                </div>
              );
            })}
          </div>
          {questions && myAnswers && (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Pitanje</th>
                  <th>Točno</th>
                  <th>{me}</th>
                  {otherRow && <th>{other}</th>}
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => {
                  const a = myAnswers.find((x) => x.id === q.id);
                  const b = otherRow?.detail?.answers.find((x) => x.id === q.id);
                  return (
                    <tr key={q.id}>
                      <td>{q.type === 'price' ? q.item : questionText(q)}</td>
                      <td>{correctText(q)}</td>
                      <td>
                        {a?.given} <span className="muted">(+{a?.points ?? 0})</span>
                      </td>
                      {otherRow && (
                        <td>
                          {b?.given} <span className="muted">(+{b?.points ?? 0})</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="card">
        <h2>Zadnjih 14 dana</h2>
        <p>
          Pobjede u dnevnim izazovima:{' '}
          {players.map((n, i) => (
            <span key={n}>
              {i > 0 && ' : '}
              <strong className={`p${i}-text`}>
                {n} {tally[n] || 0}
              </strong>
            </span>
          ))}
        </p>
        <ul className="daily-history">
          {[...new Set((rows || []).map((r) => r.date))].map((d) => (
            <li key={d}>
              <span className="muted">{new Date(d).toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' })}</span>
              {players.map((n) => {
                const r = (rows || []).find((x) => x.date === d && x.player === n);
                return (
                  <span key={n}>
                    {n}: <strong>{d === date && !done ? (r ? '✓' : '–') : (r?.score ?? '–')}</strong>
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
