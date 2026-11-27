import { useEffect, useState } from 'react';
import type { MatchRecord } from '../core/types';
import { computeStats, type PlayerStats } from '../core/stats';
import { MODE_NAMES } from '../core/gameInfo';
import { clearMatches, listMatches } from '../db/db';
import { Button, Confirm } from '../components/common';
import { useDataRefresh } from '../components/SyncBadge';

const fmtDate = (t: number) =>
  new Date(t).toLocaleString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function PlayerCard({ s, idx }: { s: PlayerStats; idx: number }) {
  const pct = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
  return (
    <div className={`card stat-card p${idx % 2}`}>
      <h2>{s.name}</h2>
      <div className="stat-big">
        <div>
          <div className="stat-num">{s.wins}</div>
          <div className="muted">pobjeda</div>
        </div>
        <div>
          <div className="stat-num">{s.matches}</div>
          <div className="muted">dvoboja</div>
        </div>
        <div>
          <div className="stat-num">{pct}%</div>
          <div className="muted">uspješnost</div>
        </div>
      </div>
      <h3>Osobni rekordi</h3>
      <ul className="records">
        <li>
          Najviše bodova u dvoboju: <strong>{s.bestScore}</strong>
        </li>
        <li>
          Najuvjerljivija pobjeda: <strong>{s.biggestWin ? `+${s.biggestWin}` : '–'}</strong>
        </li>
        <li>
          Najbolja runda: <strong>{s.bestRound}</strong>
        </li>
        <li>
          Najdulji niz pobjeda: <strong>{s.longestStreak}</strong>
        </li>
      </ul>
      {s.categories.length > 0 && (
        <>
          <h3>Uspješnost po kategorijama</h3>
          <div className="cat-bars">
            {s.categories.map((c) => {
              const v = Math.round((c.score / c.attempts) * 100);
              return (
                <div key={c.category} className="cat-bar">
                  <span className="cat-name">{c.category}</span>
                  <span className="bar">
                    <span className="bar-fill" style={{ width: `${v}%` }} />
                  </span>
                  <span className="cat-val">
                    {v}% <span className="muted small">({c.attempts})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function History({ onBack }: { onBack: () => void }) {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const load = () => void listMatches().then(setMatches);
  useEffect(load, []);
  useDataRefresh(load);

  if (!matches) return <div className="page">Učitavanje…</div>;
  const stats = computeStats(matches).sort((a, b) => b.matches - a.matches);

  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Povijest i statistika</h1>
      </div>
      {matches.length === 0 ? (
        <div className="card center">Još nema odigranih dvoboja.</div>
      ) : (
        <>
          <div className="stat-grid">
            {stats.map((s, i) => (
              <PlayerCard key={s.name} s={s} idx={i} />
            ))}
          </div>
          <section className="card">
            <h2>Prethodni dvoboji</h2>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Način</th>
                  <th>Rezultat</th>
                  <th>Pobjednik</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td>{fmtDate(m.finishedAt)}</td>
                    <td>{MODE_NAMES[m.mode]}</td>
                    <td>
                      {m.players[0]} {m.scores[0]} : {m.scores[1]} {m.players[1]}
                    </td>
                    <td>
                      <strong>{m.players[m.winner]}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="row center">
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Resetiraj statistiku
            </Button>
          </div>
        </>
      )}
      {confirm && (
        <Confirm
          title="Resetirati statistiku?"
          text="Bit će obrisani svi odigrani dvoboji, pobjede, rekordi i statistika po kategorijama – na svim uređajima. Ovo se ne može poništiti."
          confirmLabel="Obriši sve"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await clearMatches();
            setConfirm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
