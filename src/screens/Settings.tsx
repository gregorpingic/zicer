import { useState } from 'react';
import type { BotLevel, GameType, Settings as S } from '../core/types';
import { DEFAULT_TIMERS } from '../core/types';
import { GAME_TYPES, ROUND_INFO } from '../core/gameInfo';
import { BOT_LEVEL_NAMES } from '../core/bot';
import { hasCroatianVoice, speak, speechSupported } from '../core/speech';
import { sfx, setSoundEnabled } from '../core/sound';
import { Button } from '../components/common';
import { DIFFICULTY_OPTIONS, TEMPO_OPTIONS } from './Setup';

const SECONDS = [0, 5, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120];
/** Redoslijed u postavkama: od najbržih prema najsporijim igrama. */
const BY_SPEED = [...GAME_TYPES].sort((a, b) => DEFAULT_TIMERS[a] - DEFAULT_TIMERS[b]);

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
        <p className="muted small">
          Svaka igra ima svoje vrijeme – kratko za brze odluke, dulje za razmišljanje. Kad istekne, računa se kao da
          igrač nije odgovorio. Tempo množi sva vremena.
        </p>
        <div className="seg">
          {TEMPO_OPTIONS.map((t) => (
            <button key={t.v} className={s.tempo === t.v ? 'sel' : ''} onClick={() => set('tempo', t.v)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="timer-table">
          {BY_SPEED.map((t: GameType) => (
            <label key={t} className="timer-row">
              <span>{ROUND_INFO[t].name}</span>
              <select value={s.timers[t]} onChange={(e) => set('timers', { ...s.timers, [t]: Number(e.target.value) })}>
                {SECONDS.map((n) => (
                  <option key={n} value={n}>
                    {n ? `${n} s` : 'bez ograničenja'}
                    {n === DEFAULT_TIMERS[t] ? ' (preporučeno)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <Button variant="ghost" onClick={() => set('timers', DEFAULT_TIMERS)}>
          Vrati preporučena vremena
        </Button>
      </section>

      <section className="card">
        <h2>Tijek igre</h2>
        <label className="check">
          <input type="checkbox" checked={s.autoNext} onChange={(e) => set('autoNext', e.target.checked)} />
          <span>
            <strong>Automatski nastavak</strong> – nakon otkrivanja odgovora, pravila runde i sažetka igra sama ide dalje
            (pauza zaustavlja odbrojavanje)
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.mixed} onChange={(e) => set('mixed', e.target.checked)} />
          <span>
            <strong>Miješana pitanja</strong> – svako pitanje u rundi je druga vrsta igre
          </span>
        </label>
      </section>

      <section className="card">
        <h2>Računalo kao protivnik</h2>
        <div className="names">
          <label className="name-field p1">
            <span>Ime računala</span>
            <input value={s.botName} maxLength={20} onChange={(e) => set('botName', e.target.value)} />
          </label>
        </div>
        <div className="setting-line">Razina:</div>
        <div className="seg">
          {(['lako', 'srednje', 'tesko'] as BotLevel[]).map((l) => (
            <button key={l} className={s.botLevel === l ? 'sel' : ''} onClick={() => set('botLevel', l)}>
              {BOT_LEVEL_NAMES[l]}
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
