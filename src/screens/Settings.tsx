import { useState } from 'react';
import type { Settings as S, TimerSetting } from '../core/types';
import { hasCroatianVoice, speak, speechSupported } from '../core/speech';
import { sfx, setSoundEnabled } from '../core/sound';
import { Button } from '../components/common';
import { DIFFICULTY_OPTIONS } from './Setup';

const TIMERS: { v: TimerSetting; label: string }[] = [
  { v: 10, label: '10 s' },
  { v: 20, label: '20 s' },
  { v: 30, label: '30 s' },
  { v: 60, label: '60 s' },
  { v: 0, label: 'Bez ograničenja' },
];

export default function Settings({ settings, onSave, onBack }: { settings: S; onSave: (s: S) => void; onBack: () => void }) {
  const [s, setS] = useState(settings);
  const set = <K extends keyof S>(k: K, v: S[K]) => {
    const next = { ...s, [k]: v };
    setS(next);
    onSave(next);
  };

  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Postavke</h1>
      </div>

      <section className="card">
        <h2>Zadana imena igrača</h2>
        <div className="names">
          {([0, 1] as const).map((p) => (
            <label key={p} className={`name-field p${p}`}>
              <span>Igrač {p + 1}</span>
              <input
                value={s.players[p]}
                maxLength={20}
                onChange={(e) => {
                  const n: [string, string] = [...s.players];
                  n[p] = e.target.value;
                  set('players', n);
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Vrijeme za odgovor</h2>
        <p className="muted small">Za „Nabroji tri” i potez u „Kategorijskom dvoboju” (najviše 20 s po potezu).</p>
        <div className="seg">
          {TIMERS.map((t) => (
            <button key={t.v} className={s.timer === t.v ? 'sel' : ''} onClick={() => set('timer', t.v)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Zadana težina pitanja</h2>
        <div className="seg">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button key={d.v} className={s.difficulty === d.v ? 'sel' : ''} onClick={() => set('difficulty', d.v)}>
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Zvuk i glas</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={s.sound}
            onChange={(e) => {
              set('sound', e.target.checked);
              setSoundEnabled(e.target.checked);
              if (e.target.checked) sfx.correct();
            }}
          />
          Zvučni efekti
        </label>
        <label className="check">
          <input type="checkbox" checked={s.speech} disabled={!speechSupported()} onChange={(e) => set('speech', e.target.checked)} />
          Glasovno čitanje pitanja (gumb 🔊 uz pitanje)
        </label>
        <label className="check">
          <input type="checkbox" checked={s.autoSpeak} disabled={!s.speech} onChange={(e) => set('autoSpeak', e.target.checked)} />
          Automatski pročitaj svako pitanje
        </label>
        {s.speech && (
          <div className="row">
            <Button variant="secondary" onClick={() => speak('Dobro došli u Zicer! Ovo je probno čitanje na hrvatskom jeziku.')}>
              Isprobaj glas
            </Button>
            {!hasCroatianVoice() && (
              <span className="muted small">Na ovom uređaju nije pronađen hrvatski glas – čitanje može zvučati strano.</span>
            )}
          </div>
        )}
        {!speechSupported() && <div className="muted small">Ovaj preglednik ne podržava glasovno čitanje.</div>}
      </section>
    </div>
  );
}
