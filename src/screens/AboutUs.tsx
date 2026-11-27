import { useEffect, useState } from 'react';
import type { KnowMeQuestion, PlayerIndex, Settings } from '../core/types';
import { addQuestions, deleteQuestion, packQuestions } from '../db/db';
import { Button } from '../components/common';

// „Pitanja o nama”: svatko upiše pitanja o sebi s točnim odgovorom. U igri „Koliko me poznaješ?”
// drugi igrač pogađa, a odgovor je već poznat – nema dogovaranja na licu mjesta.

// Svaki igrač ima vlastiti paket kako se istodobne izmjene na dva uređaja ne bi međusobno prebrisale.
const packFor = (name: string) => ({ id: `o-nama-${slug(name) || 'igrac'}`, name: `Pitanja o nama – ${name}` });

const TEMPLATES = [
  'Koje mi je najdraže jelo?',
  'Koja mi je najdraža serija?',
  'Gdje bih najradije otputovao/la?',
  'Čega se najviše bojim?',
  'Koja mi je najdraža pjesma?',
  'Što bih jeo/la zadnje na svijetu?',
  'Koji mi je bio prvi mobitel?',
  'Kako se zvala moja prva simpatija?',
  'Koji mi je najdraži film iz djetinjstva?',
  'Što me najviše živcira?',
  'Koja mi je najdraža boja?',
  'Što sam htio/htjela biti kad sam bio/la mali/a?',
  'Koja mi je najdraža slastica?',
  'Koji je moj najveći guilty pleasure?',
  'Koje bih supermoći htio/htjela imati?',
];

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

export default function AboutUs({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const [me, setMe] = useState<string | null>(() => localStorage.getItem('zicer-daily-me'));
  const [list, setList] = useState<KnowMeQuestion[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  const reload = () =>
    Promise.all(settings.players.map((n) => packQuestions(packFor(n).id))).then((qs) =>
      setList(qs.flat().filter((q): q is KnowMeQuestion => q.type === 'knowme')),
    );
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const players = settings.players;
  const mine = list.filter((q) => q.about === me);
  const counts = players.map((n) => list.filter((q) => q.about === n).length);

  const add = async () => {
    if (!me || !question.trim() || !answer.trim()) return;
    const q: KnowMeQuestion = {
      id: `onama-${slug(me)}-${Date.now().toString(36)}`,
      type: 'knowme',
      question: question.trim(),
      about: me,
      answer: answer.trim(),
      packId: packFor(me).id,
    };
    await addQuestions([q], { ...packFor(me), importedAt: Date.now(), count: 0 });
    setQuestion('');
    setAnswer('');
    setMsg('Spremljeno ✓');
    setTimeout(() => setMsg(''), 1500);
    void reload();
  };

  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Pitanja o nama</h1>
      </div>
      <section className="card">
        <p>
          Upiši pitanja o sebi i točan odgovor. U igri <strong>Koliko me poznaješ?</strong> drugi igrač pogađa – a odgovor se
          otkriva tek tada. Svaki od vas neka upisuje na svom uređaju da ne vidi tuđe odgovore.
        </p>
        <div className="row">
          {players.map((n, p) => (
            <Button
              key={n}
              variant={me === n ? 'primary' : 'secondary'}
              className={`p${p as PlayerIndex}`}
              onClick={() => {
                localStorage.setItem('zicer-daily-me', n);
                setMe(n);
              }}
            >
              Ja sam {n} ({counts[p]})
            </Button>
          ))}
        </div>
      </section>

      {me && (
        <>
          <section className="card">
            <h2>Novo pitanje o meni</h2>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Pitanje, npr. Koje mi je najdraže jelo?" maxLength={200} />
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Točan odgovor (vidi se tek u igri)" maxLength={200} autoComplete="off" />
              <div className="row">
                <Button type="submit" disabled={!question.trim() || !answer.trim()}>
                  Spremi pitanje
                </Button>
                {msg && <span className="muted">{msg}</span>}
              </div>
            </form>
            <div className="chips">
              {TEMPLATES.filter((t) => !mine.some((q) => q.question === t)).map((t) => (
                <button key={t} className="chip" onClick={() => setQuestion(t)}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Moja pitanja ({mine.length})</h2>
            {!mine.length && <p className="muted">Još nema pitanja. Upiši barem 5 da bude zanimljivo.</p>}
            <ul className="about-list">
              {mine.map((q) => (
                <li key={q.id}>
                  <span>{q.question}</span>
                  <span className="muted">
                    {shown.has(q.id) ? (
                      q.answer
                    ) : (
                      <button className="link-btn" onClick={() => setShown(new Set([...shown, q.id]))}>
                        prikaži odgovor
                      </button>
                    )}
                  </span>
                  <button
                    className="link-btn danger"
                    onClick={() => {
                      if (confirm('Obrisati ovo pitanje?')) void deleteQuestion(q.id).then(reload);
                    }}
                  >
                    obriši
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
