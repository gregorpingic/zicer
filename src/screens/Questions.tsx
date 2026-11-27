import { useEffect, useState } from 'react';
import type { GameType, PackInfo, Question } from '../core/types';
import { GAME_TYPES, ROUND_INFO, questionText } from '../core/gameInfo';
import { QUIZ_CATEGORIES, parsePack, validateQuestion } from '../core/validate';
import { addQuestions, allQuestions, clearPlayed, deletePack, deleteQuestion, listPacks, playedCount } from '../db/db';
import { Button, Confirm, parseNumber, plural } from '../components/common';
import SyncBadge, { useDataRefresh } from '../components/SyncBadge';

const OWN_PACK: Omit<PackInfo, 'count' | 'importedAt'> = { id: 'vlastita-pitanja', name: 'Vlastita pitanja' };

// ---------------- Uvoz ----------------

interface ImportResult {
  file: string;
  error?: string;
  pack?: string;
  added?: number;
  duplicates?: string[];
  invalid?: { index: number; id?: string; error: string }[];
}

async function importText(text: string, file: string): Promise<ImportResult> {
  try {
    const parsed = parsePack(text);
    const rep = await addQuestions(parsed.valid, { ...parsed.pack, importedAt: Date.now(), count: 0 });
    return { file, pack: parsed.pack.name, added: rep.added.length, duplicates: rep.duplicates, invalid: parsed.invalid };
  } catch (e) {
    return { file, error: (e as Error).message };
  }
}

function ImportSection({ onChange }: { onChange: () => void }) {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [paste, setPaste] = useState('');
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const out: ImportResult[] = [];
    for (const f of Array.from(files)) out.push(await importText(await f.text(), f.name));
    setResults(out);
    onChange();
  };
  return (
    <section className="card">
      <h2>Uvoz paketa pitanja</h2>
      <p className="muted">
        Odaberite jednu ili više JSON datoteka u formatu <code>zicer-paket</code>. Pitanja čiji ID već postoji u bazi
        odbijaju se kao duplikati, a neispravna pitanja preskaču se uz opis greške.
      </p>
      <label className="file-btn">
        <input type="file" accept=".json,application/json" multiple onChange={(e) => void handleFiles(e.target.files).then(() => (e.target.value = ''))} />
        <span className="btn btn-primary">Odaberi JSON datoteke…</span>
      </label>
      <details>
        <summary>…ili zalijepite JSON</summary>
        <textarea className="json-area" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"format": "zicer-paket", ...}' />
        <Button
          variant="secondary"
          disabled={!paste.trim()}
          onClick={async () => {
            setResults([await importText(paste, 'zalijepljeni JSON')]);
            onChange();
          }}
        >
          Uvezi zalijepljeno
        </Button>
      </details>
      {results.map((r, i) => (
        <div key={i} className={`import-report ${r.error ? 'err' : ''}`}>
          <strong>{r.file}</strong>
          {r.error ? (
            <div className="msg msg-bad">{r.error}</div>
          ) : (
            <>
              <div>
                Paket „{r.pack}”: {plural(r.added!, 'dodano je', 'dodana su', 'dodano je')} <strong>{r.added}</strong> {plural(r.added!, 'pitanje', 'pitanja', 'pitanja')}
                {r.duplicates!.length > 0 && <>, odbijeno duplikata: <strong>{r.duplicates!.length}</strong></>}
                {r.invalid!.length > 0 && <>, neispravnih: <strong>{r.invalid!.length}</strong></>}.
              </div>
              {r.duplicates!.length > 0 && <div className="muted small">Duplikati (ID već postoji): {r.duplicates!.join(', ')}</div>}
              {r.invalid!.map((x) => (
                <div key={x.index} className="small bad-text">
                  Pitanje #{x.index + 1}
                  {x.id ? ` (${x.id})` : ''}: {x.error}
                </div>
              ))}
            </>
          )}
        </div>
      ))}
      <h3>Primjeri valjanih paketa</h3>
      <p className="muted small">Svaka datoteka je zaseban paket s jednim primjerom pitanja. Možete ih preuzeti, urediti i uvesti.</p>
      <div className="examples">
        <a className="btn btn-secondary" href="primjeri/svi-primjeri.json" download>
          Svi primjeri u jednom paketu
        </a>
        {GAME_TYPES.map((t) => (
          <a key={t} className="btn btn-ghost" href={`primjeri/${t}.json`} download>
            {ROUND_INFO[t].name}
          </a>
        ))}
      </div>
    </section>
  );
}

// ---------------- Vlastito pitanje ----------------

type FieldKind = 'text' | 'textarea' | 'number' | 'index1' | 'bool' | 'select' | 'list' | 'feud';
interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  optional?: boolean;
  options?: { v: string; label: string }[];
  help?: string;
  def?: string | boolean;
}

const SRC: Field = { key: 'source', label: 'Izvor', kind: 'text', help: 'npr. Hrvatska enciklopedija, NASA…' };
const EXPL: Field = { key: 'explanation', label: 'Kratko objašnjenje', kind: 'textarea' };
const EXPL_OPT: Field = { ...EXPL, optional: true };
const SRC_OPT: Field = { ...SRC, optional: true };

const FIELDS: Record<GameType, Field[]> = {
  feud: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'answers', label: 'Odgovori', kind: 'feud', help: 'Svaki u svom retku: Odgovor | bodovi, od najpopularnijeg. 3–8 odgovora.' },
    { key: 'estimated', label: 'Procijenjeni odgovori (nije stvarna anketa)', kind: 'bool', def: true },
    SRC_OPT,
  ],
  closest: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'answer', label: 'Točan broj', kind: 'number' },
    { key: 'unit', label: 'Mjerna jedinica', kind: 'text', optional: true },
    SRC,
    EXPL,
  ],
  list3: [
    { key: 'prompt', label: 'Zadatak', kind: 'text', help: 'npr. Nabroji tri…' },
    { key: 'examples', label: 'Primjeri odgovora', kind: 'list', optional: true, help: 'Svaki u svom retku.' },
  ],
  knowme: [{ key: 'question', label: 'Pitanje', kind: 'text' }],
  association: [
    { key: 'clues', label: 'Tragovi', kind: 'list', help: '3–8 tragova, svaki u svom retku, od težeg prema lakšem.' },
    { key: 'answer', label: 'Rješenje', kind: 'text' },
    { key: 'accept', label: 'Prihvatljivi drugi oblici', kind: 'list', optional: true },
    EXPL_OPT,
  ],
  truefalse: [
    { key: 'statement', label: 'Tvrdnja', kind: 'text' },
    { key: 'answer', label: 'Točno je', kind: 'select', options: [{ v: 'true', label: 'Istina' }, { v: 'false', label: 'Laž' }] },
    SRC,
    EXPL,
  ],
  quiz: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'options', label: 'Ponuđeni odgovori', kind: 'list', help: 'Točno 4 odgovora, svaki u svom retku.' },
    { key: 'correct', label: 'Redni broj točnog odgovora (1–4)', kind: 'index1' },
    { key: 'category', label: 'Kategorija', kind: 'select', options: QUIZ_CATEGORIES.map((c) => ({ v: c, label: c })) },
    SRC,
    EXPL,
  ],
  order: [
    { key: 'prompt', label: 'Zadatak', kind: 'text' },
    { key: 'items', label: 'Pojmovi u TOČNOM redoslijedu', kind: 'list', help: '3–6 pojmova; aplikacija ih sama miješa.' },
    { key: 'values', label: 'Vrijednosti uz pojmove', kind: 'list', optional: true, help: 'Isti broj redaka kao pojmovi (npr. godine).' },
    SRC,
    EXPL,
  ],
  oddone: [
    { key: 'prompt', label: 'Zadatak', kind: 'text', optional: true },
    { key: 'items', label: 'Pojmovi', kind: 'list', help: '4 ili 5 pojmova.' },
    { key: 'odd', label: 'Redni broj uljeza', kind: 'index1' },
    EXPL,
    SRC_OPT,
  ],
  describe: [
    { key: 'subject', label: 'Što se pogađa', kind: 'text', help: 'Osoba, Životinja, Film, Predmet, Država, Hrana…' },
    { key: 'clues', label: 'Tragovi', kind: 'list', help: '3–8 tragova, od težeg prema lakšem.' },
    { key: 'answer', label: 'Rješenje', kind: 'text' },
    { key: 'accept', label: 'Prihvatljivi drugi oblici', kind: 'list', optional: true },
  ],
  higherlower: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'options', label: 'Dva odgovora', kind: 'list', def: 'Više\nManje' },
    { key: 'correct', label: 'Točan je', kind: 'select', options: [{ v: '0', label: 'Prvi' }, { v: '1', label: 'Drugi' }] },
    SRC,
    EXPL,
  ],
  category: [
    { key: 'topic', label: 'Kategorija', kind: 'text' },
    { key: 'examples', label: 'Primjeri', kind: 'list', optional: true },
  ],
  year: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'answer', label: 'Godina', kind: 'number' },
    SRC,
    EXPL,
  ],
  price: [
    { key: 'item', label: 'Artikl ili usluga', kind: 'text', help: 'npr. Kugla sladoleda' },
    { key: 'details', label: 'Pobliži opis', kind: 'text', optional: true, help: 'npr. u kafiću na moru, ljeto 2025.' },
    { key: 'answer', label: 'Okvirna cijena u eurima', kind: 'number' },
    { ...EXPL, optional: true },
    SRC_OPT,
  ],
  risk: [
    { key: 'question', label: 'Pitanje', kind: 'text' },
    { key: 'options', label: 'Ponuđeni odgovori', kind: 'list', help: 'Točno 4 odgovora.' },
    { key: 'correct', label: 'Redni broj točnog odgovora (1–4)', kind: 'index1' },
    { key: 'category', label: 'Kategorija', kind: 'text' },
    SRC,
    EXPL,
  ],
};

function buildQuestion(type: GameType, values: Record<string, string | boolean>, difficulty: string): unknown {
  const q: Record<string, unknown> = { id: `vl-${type}-${Date.now().toString(36)}`, type, difficulty: Number(difficulty) };
  for (const f of FIELDS[type]) {
    const raw = values[f.key] ?? f.def ?? '';
    if (f.kind === 'bool') {
      q[f.key] = raw === true;
      continue;
    }
    const s = String(raw).trim();
    if (!s) continue;
    const lines = () => s.split('\n').map((l) => l.trim()).filter(Boolean);
    switch (f.kind) {
      case 'number':
        q[f.key] = parseNumber(s) ?? s;
        break;
      case 'index1':
        q[f.key] = (parseNumber(s) ?? 0) - 1;
        break;
      case 'select':
        q[f.key] = s === 'true' ? true : s === 'false' ? false : /^\d$/.test(s) ? Number(s) : s;
        break;
      case 'list':
        q[f.key] = lines();
        break;
      case 'feud':
        q[f.key] = lines().map((l) => {
          const [text, pts] = l.split('|');
          return { text: (text || '').trim(), points: parseNumber(pts || '') ?? 0 };
        });
        break;
      default:
        q[f.key] = s;
    }
  }
  return q;
}

function CustomQuestionForm({ onAdded }: { onAdded: () => void }) {
  const [type, setType] = useState<GameType>('quiz');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [difficulty, setDifficulty] = useState('2');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    try {
      const q = validateQuestion(buildQuestion(type, values, difficulty));
      const rep = await addQuestions([{ ...q, packId: OWN_PACK.id }], { ...OWN_PACK, importedAt: Date.now(), count: 0 });
      if (rep.duplicates.length) throw new Error('Pitanje s tim ID-jem već postoji.');
      setMsg({ ok: true, text: 'Pitanje je spremljeno.' });
      setValues({});
      onAdded();
    } catch (e) {
      setMsg({ ok: false, text: `Pitanje nije spremljeno: ${(e as Error).message}` });
    }
  };

  return (
    <section className="card">
      <h2>Dodaj vlastito pitanje</h2>
      <div className="form-grid">
        <label>
          Vrsta igre
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as GameType);
              setValues({});
              setMsg(null);
            }}
          >
            {GAME_TYPES.map((t) => (
              <option key={t} value={t}>
                {ROUND_INFO[t].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Težina
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="1">Lako</option>
            <option value="2">Srednje</option>
            <option value="3">Teško</option>
          </select>
        </label>
        {FIELDS[type].map((f) => {
          const v = values[f.key] ?? f.def ?? '';
          const set = (x: string | boolean) => setValues({ ...values, [f.key]: x });
          return (
            <label key={f.key} className={f.kind === 'bool' ? 'check' : 'wide'}>
              {f.kind === 'bool' ? (
                <>
                  <input type="checkbox" checked={v === true} onChange={(e) => set(e.target.checked)} /> {f.label}
                </>
              ) : (
                <>
                  <span>
                    {f.label}
                    {f.optional && <span className="muted"> (neobavezno)</span>}
                  </span>
                  {f.kind === 'select' ? (
                    <select value={String(v)} onChange={(e) => set(e.target.value)}>
                      <option value="">– odaberi –</option>
                      {f.options!.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === 'list' || f.kind === 'feud' || f.kind === 'textarea' ? (
                    <textarea rows={f.kind === 'textarea' ? 2 : 5} value={String(v)} onChange={(e) => set(e.target.value)} />
                  ) : (
                    <input value={String(v)} inputMode={f.kind === 'text' ? undefined : 'numeric'} onChange={(e) => set(e.target.value)} />
                  )}
                  {f.help && <span className="muted small">{f.help}</span>}
                </>
              )}
            </label>
          );
        })}
      </div>
      {msg && <div className={`msg ${msg.ok ? 'msg-good' : 'msg-bad'}`}>{msg.text}</div>}
      <Button onClick={save}>Spremi pitanje</Button>
    </section>
  );
}

// ---------------- Pregled ----------------

export default function Questions({ onBack }: { onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [played, setPlayed] = useState(0);
  const [open, setOpen] = useState<GameType | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null);

  const load = async () => {
    setQuestions(await allQuestions());
    setPacks(await listPacks());
    setPlayed(await playedCount());
  };
  useEffect(() => {
    void load();
  }, []);
  useDataRefresh(() => void load());

  const own = questions.filter((q) => q.packId === OWN_PACK.id);
  const exportOwn = () => {
    const data = { format: 'zicer-paket', version: 1, pack: { id: OWN_PACK.id, name: OWN_PACK.name }, questions: own.map(({ packId: _p, ...q }) => q) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zicer-vlastita-pitanja.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Pitanja i paketi</h1>
      </div>

      <section className="card">
        <h2>Baza pitanja</h2>
        <p className="muted small">
          Pitanja, povijest i statistika dijele se između svih uređaja (laptop, televizor, mobiteli) preko zajedničke
          baze. <SyncBadge />
        </p>
        <p>
          Ukupno <strong>{questions.length}</strong> pitanja · odigrano (pamti se između sesija): <strong>{played}</strong>
        </p>
        <div className="type-counts">
          {GAME_TYPES.map((t) => {
            const list = questions.filter((q) => q.type === t);
            return (
              <div key={t} className="type-count">
                <button className="link-btn" onClick={() => setOpen(open === t ? null : t)}>
                  {ROUND_INFO[t].name}: <strong>{list.length}</strong> {open === t ? '▲' : '▼'}
                </button>
                {open === t && (
                  <ul className="q-list">
                    {list.map((q) => (
                      <li key={q.id}>
                        <span className="q-id">{q.id}</span> {questionText(q)}
                        <button
                          className="link-btn danger"
                          onClick={() =>
                            setConfirm({
                              title: 'Obrisati pitanje?',
                              text: `„${questionText(q)}” bit će trajno obrisano iz baze.`,
                              run: () => deleteQuestion(q.id),
                            })
                          }
                        >
                          obriši
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setConfirm({
              title: 'Resetirati odigrana pitanja?',
              text: 'Aplikacija će zaboraviti koja su pitanja već odigrana (na svim uređajima) pa se sva mogu ponovno pojaviti.',
              run: () => clearPlayed(),
            })
          }
        >
          Resetiraj evidenciju odigranih pitanja
        </Button>
      </section>

      <section className="card">
        <h2>Uvezeni paketi</h2>
        <ul className="pack-list">
          {packs.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong> <span className="muted small">({p.id})</span>
                <div className="muted small">
                  {p.count} {plural(p.count, 'pitanje', 'pitanja', 'pitanja')}{p.author ? ` · ${p.author}` : ''}
                  {p.description ? ` · ${p.description}` : ''}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  setConfirm({
                    title: 'Obrisati paket?',
                    text: `Paket „${p.name}” i sva njegova pitanja (${p.count}) bit će obrisani na svim uređajima.`,
                    run: () => deletePack(p.id),
                  })
                }
              >
                Obriši
              </Button>
            </li>
          ))}
        </ul>
        {own.length > 0 && (
          <Button variant="secondary" onClick={exportOwn}>
            Izvezi vlastita pitanja (JSON)
          </Button>
        )}
      </section>

      <ImportSection onChange={() => void load()} />
      <CustomQuestionForm onAdded={() => void load()} />

      {confirm && (
        <Confirm
          title={confirm.title}
          text={confirm.text}
          danger
          confirmLabel="Obriši"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await confirm.run();
            setConfirm(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
