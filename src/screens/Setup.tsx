import { useEffect, useState } from 'react';
import type { DifficultySetting, GameMode, GameType, MatchConfig, Settings } from '../core/types';
import { GAME_TYPES, MODES, MODE_NAMES, ROUND_INFO } from '../core/gameInfo';
import { planRounds } from '../core/engine';
import { countByType } from '../db/db';
import { Button } from '../components/common';

export const DIFFICULTY_OPTIONS: { v: DifficultySetting; label: string }[] = [
  { v: 'sve', label: 'Mješovito' },
  { v: 'lako', label: 'Lako' },
  { v: 'srednje', label: 'Srednje' },
  { v: 'tesko', label: 'Teško' },
];

export default function Setup({
  settings,
  onStart,
  onBack,
}: {
  settings: Settings;
  onStart: (players: [string, string], config: MatchConfig) => void;
  onBack: () => void;
}) {
  const [players, setPlayers] = useState<[string, string]>(settings.players);
  const [mode, setMode] = useState<GameMode>('standardni');
  const [random, setRandom] = useState(true);
  const [selected, setSelected] = useState<GameType[]>(GAME_TYPES);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customRounds, setCustomRounds] = useState(5);
  const [customQ, setCustomQ] = useState(4);
  const [finale, setFinale] = useState(true);
  const [difficulty, setDifficulty] = useState<DifficultySetting>(settings.difficulty);

  useEffect(() => {
    void countByType().then(setCounts);
  }, []);
  useEffect(() => {
    if (mode !== 'prilagodjeni') setFinale(MODES[mode].finale);
  }, [mode]);

  const available = GAME_TYPES.filter((t) => (counts[t] || 0) > 0);
  const types = (random ? available : selected.filter((t) => available.includes(t)));
  const rounds = mode === 'prilagodjeni' ? customRounds : MODES[mode].rounds;
  const qpr = mode === 'prilagodjeni' ? customQ : MODES[mode].questionsPerRound;
  const namesOk = players[0].trim() && players[1].trim() && players[0].trim() !== players[1].trim();
  const canStart = namesOk && types.length > 0;

  const toggle = (t: GameType) =>
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const start = () => {
    const config: MatchConfig = {
      mode,
      types,
      finale,
      rounds: planRounds(types, rounds, finale),
      questionsPerRound: qpr,
      difficulty,
    };
    onStart([players[0].trim(), players[1].trim()], config);
  };

  return (
    <div className="page setup">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Novi dvoboj</h1>
      </div>

      <section className="card">
        <h2>Igrači</h2>
        <div className="names">
          {([0, 1] as const).map((p) => (
            <label key={p} className={`name-field p${p}`}>
              <span>Igrač {p + 1}</span>
              <input
                value={players[p]}
                maxLength={20}
                onChange={(e) => {
                  const n: [string, string] = [...players];
                  n[p] = e.target.value;
                  setPlayers(n);
                }}
              />
            </label>
          ))}
        </div>
        {!namesOk && <div className="msg msg-bad">Upišite dva različita imena.</div>}
      </section>

      <section className="card">
        <h2>Način igranja</h2>
        <div className="modes">
          {(Object.keys(MODES) as (keyof typeof MODES)[]).map((m) => (
            <button key={m} className={`mode ${mode === m ? 'sel' : ''}`} onClick={() => setMode(m)}>
              <div className="mode-name">{MODES[m].name}</div>
              <div className="mode-meta">
                {MODES[m].duration} · {MODES[m].rounds} rundi
              </div>
            </button>
          ))}
          <button className={`mode ${mode === 'prilagodjeni' ? 'sel' : ''}`} onClick={() => setMode('prilagodjeni')}>
            <div className="mode-name">{MODE_NAMES.prilagodjeni}</div>
            <div className="mode-meta">Proizvoljno · po izboru</div>
          </button>
        </div>
        {mode === 'prilagodjeni' && (
          <div className="custom-opts">
            <label>
              Broj rundi
              <div className="stepper">
                <Button variant="secondary" onClick={() => setCustomRounds(Math.max(1, customRounds - 1))}>
                  −
                </Button>
                <span>{customRounds}</span>
                <Button variant="secondary" onClick={() => setCustomRounds(Math.min(20, customRounds + 1))}>
                  +
                </Button>
              </div>
            </label>
            <label>
              Pitanja po rundi
              <div className="seg">
                {[2, 4, 6].map((n) => (
                  <button key={n} className={customQ === n ? 'sel' : ''} onClick={() => setCustomQ(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </label>
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={finale} onChange={(e) => setFinale(e.target.checked)} disabled={rounds < 2} />
          Zadnja runda je <strong>Veliko finale</strong> (dvostruki bodovi, prilika za preokret)
        </label>
        <div className="muted small">Pitanja po rundi: {qpr} · igrači se izmjenjuju na potezu.</div>
      </section>

      <section className="card">
        <h2>Vrste igara</h2>
        <div className="seg">
          <button className={random ? 'sel' : ''} onClick={() => setRandom(true)}>
            Nasumično (sve)
          </button>
          <button className={!random ? 'sel' : ''} onClick={() => setRandom(false)}>
            Odaberi vrste
          </button>
        </div>
        {!random && (
          <div className="type-grid">
            {GAME_TYPES.map((t) => {
              const n = counts[t] || 0;
              return (
                <label key={t} className={`type-opt ${n === 0 ? 'disabled' : ''}`}>
                  <input type="checkbox" checked={selected.includes(t) && n > 0} disabled={n === 0} onChange={() => toggle(t)} />
                  <span>
                    <strong>{ROUND_INFO[t].name}</strong>
                    <span className="muted small"> · {n} pitanja</span>
                    <br />
                    <span className="muted small">{ROUND_INFO[t].short}</span>
                  </span>
                </label>
              );
            })}
            <div className="row">
              <Button variant="ghost" onClick={() => setSelected(GAME_TYPES)}>
                Označi sve
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])}>
                Odznači sve
              </Button>
            </div>
          </div>
        )}
        {types.length === 0 && <div className="msg msg-bad">Odaberite barem jednu vrstu igre koja ima pitanja.</div>}
      </section>

      <section className="card">
        <h2>Težina pitanja</h2>
        <div className="seg">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button key={d.v} className={difficulty === d.v ? 'sel' : ''} onClick={() => setDifficulty(d.v)}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="muted small">Ako za odabranu težinu nema neodigranih pitanja, uzimaju se pitanja druge težine.</div>
      </section>

      <div className="next-row">
        <Button big onClick={start} disabled={!canStart}>
          Započni dvoboj
        </Button>
      </div>
    </div>
  );
}
