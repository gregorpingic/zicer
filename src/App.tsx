import { useEffect, useState } from 'react';
import type { GameMode, MatchConfig, MatchState, PackInfo, Settings } from './core/types';
import { DEFAULT_SETTINGS } from './core/types';
import { createMatch, planRounds } from './core/engine';
import { parsePack } from './core/validate';
import { GAME_TYPES, MODES, MODE_NAMES, ROUND_INFO } from './core/gameInfo';
import { setSoundEnabled } from './core/sound';
import { addQuestions, countByType, db, loadSavedMatch, loadSettings, saveMatch, saveSettings } from './db/db';
import { RemoteHost } from './remote/host';
import { RemoteContext } from './remote/RemoteContext';
import { newRoomCode } from './remote/protocol';
import TvLobby from './remote/TvLobby';
import builtinPack from './data/osnovni-paket.json';
import { Button, Confirm, SettingsContext } from './components/common';
import GameScreen from './screens/GameScreen';
import Setup from './screens/Setup';
import History from './screens/History';
import Questions from './screens/Questions';
import SettingsScreen from './screens/Settings';

type Screen = 'home' | 'setup' | 'game' | 'history' | 'questions' | 'settings' | 'help' | 'tv';

/** Kod sobe ostaje isti između učitavanja, da se mobiteli mogu sami ponovno spojiti. */
function roomCode(): string {
  let c = localStorage.getItem('zicer-soba');
  if (!c) {
    c = newRoomCode();
    localStorage.setItem('zicer-soba', c);
  }
  return c;
}

const BUILTIN_VERSION = 1;

/** Pri prvom pokretanju (ili novoj verziji ugrađenog paketa) uvozi ugrađena pitanja. */
async function seedBuiltin() {
  const d = await db();
  const seeded = (await d.get('kv', 'builtinVersion')) as number | undefined;
  if (seeded === BUILTIN_VERSION) return;
  const parsed = parsePack(builtinPack);
  const info: PackInfo = { ...parsed.pack, importedAt: Date.now(), count: 0, builtin: true };
  await addQuestions(parsed.valid, info);
  await d.put('kv', BUILTIN_VERSION, 'builtinVersion');
}

function Help({ onBack }: { onBack: () => void }) {
  return (
    <div className="page">
      <div className="page-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <h1>Kako se igra</h1>
      </div>
      <section className="card">
        <p>
          Zicer je kviz za dvoje na jednom uređaju – bez voditelja. Aplikacija postavlja pitanja, vodi bodove, izmjenjuje
          igrače i proglašava pobjednika. Kad je potreban tajni odgovor, aplikacija traži da predate uređaj i ne prikazuje
          rješenje dok oba igrača ne odgovore.
        </p>
        <p className="muted">
          Tijekom igre: <strong>Pauza</strong> skriva pitanje i zaustavlja vrijeme (tipka P), <strong>Preskoči</strong> daje
          novo pitanje iste vrste, a <strong>Korekcija bodova</strong> služi kad smatrate da je odgovor pogrešno vrednovan.
          Neriješen rezultat razrješava se dodatnim pitanjem.
        </p>
      </section>
      {(Object.keys(ROUND_INFO) as (keyof typeof ROUND_INFO)[]).map((k) => (
        <section key={k} className="card">
          <h2>{ROUND_INFO[k].name}</h2>
          <p className="muted">{ROUND_INFO[k].short}</p>
          <ul className="rules">
            {ROUND_INFO[k].rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState<Screen>('home');
  const [match, setMatch] = useState<MatchState | null>(null);
  const [saved, setSaved] = useState<MatchState | null>(null);
  const [pendingStart, setPendingStart] = useState<MatchState | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [host, setHost] = useState<RemoteHost | null>(null);

  // Način "televizor + mobiteli": domaćin postoji dok je televizor u tom načinu.
  const startTv = () => {
    if (!host) setHost(new RemoteHost(roomCode(), settings.players));
    void go('tv');
  };
  const stopTv = () => {
    host?.destroy();
    setHost(null);
    void go('home');
  };
  useEffect(() => () => host?.destroy(), [host]);

  const discardSaved = async () => {
    await saveMatch(null);
    setSaved(null);
    setConfirmDiscard(false);
  };

  const quickStart = async (mode: Exclude<GameMode, 'prilagodjeni'>) => {
    const counts = await countByType();
    const types = GAME_TYPES.filter((t) => (counts[t] || 0) > 0);
    const m = MODES[mode];
    const config: MatchConfig = {
      mode,
      types,
      finale: m.finale,
      rounds: planRounds(types, m.rounds, m.finale),
      questionsPerRound: m.questionsPerRound,
      difficulty: settings.difficulty,
    };
    await saveMatch(null);
    setSaved(null);
    void begin(createMatch(settings.players, config));
  };

  useEffect(() => {
    (async () => {
      await seedBuiltin();
      const s = await loadSettings();
      setSettings(s);
      setSoundEnabled(s.sound);
      setSaved(await loadSavedMatch());
      setReady(true);
    })().catch((e) => setError(String(e?.message || e)));
  }, []);

  const go = async (s: Screen) => {
    if (s === 'home') setSaved(await loadSavedMatch());
    setScreen(s);
    window.scrollTo(0, 0);
  };

  const begin = async (m: MatchState) => {
    await saveMatch(m);
    setMatch(m);
    setScreen('game');
  };
  const requestStart = (m: MatchState) => {
    if (saved && saved.id !== m.id) setPendingStart(m);
    else void begin(m);
  };

  const updateSettings = (s: Settings) => {
    setSettings(s);
    void saveSettings(s);
  };

  if (error)
    return (
      <div className="page center">
        <h1>Greška pri pokretanju</h1>
        <p>Pohrana podataka (IndexedDB) nije dostupna: {error}</p>
        <p className="muted">Provjerite da preglednik nije u privatnom načinu rada.</p>
      </div>
    );
  if (!ready) return <div className="page center">Učitavanje…</div>;

  let content;
  switch (screen) {
    case 'setup':
      content = (
        <Setup
          settings={settings}
          onBack={() => go('home')}
          onStart={(players: [string, string], config: MatchConfig) => {
            if (players.join() !== settings.players.join()) updateSettings({ ...settings, players });
            requestStart(createMatch(players, config));
          }}
        />
      );
      break;
    case 'game':
      content = match && (
        <GameScreen
          key={match.id}
          initial={match}
          onExit={() => {
            setMatch(null);
            void go(host ? 'tv' : 'home');
          }}
          onRematch={(prev) => {
            const c = prev.config;
            const config = { ...c, rounds: planRounds(c.types, c.rounds.length, c.finale) };
            void begin(createMatch(prev.players, config));
          }}
        />
      );
      break;
    case 'history':
      content = <History onBack={() => go('home')} />;
      break;
    case 'questions':
      content = <Questions onBack={() => go('home')} />;
      break;
    case 'settings':
      content = <SettingsScreen settings={settings} onSave={updateSettings} onBack={() => go('home')} />;
      break;
    case 'help':
      content = <Help onBack={() => go('home')} />;
      break;
    case 'tv':
      content = host && (
        <TvLobby
          host={host}
          saved={saved}
          onBack={stopTv}
          onStart={(mode) => void quickStart(mode)}
          onResume={() => {
            if (saved) {
              setMatch(saved);
              setScreen('game');
            }
          }}
          onDiscard={() => setConfirmDiscard(true)}
        />
      );
      break;
    default:
      content = (
        <div className="home">
          <div className="logo">
            <span className="logo-mark">Z</span>
            <div>
              <h1 className="logo-text">Zicer</h1>
              <div className="logo-sub">kućni kviz dvoboj</div>
            </div>
          </div>
          <div className="home-players">
            <span className="ptag p0">{settings.players[0]}</span>
            <span className="vs">vs</span>
            <span className="ptag p1">{settings.players[1]}</span>
          </div>
          <div className="home-menu">
            {saved && (
              <div className="resume-box">
                <Button big variant="secondary" className="resume" onClick={() => { setMatch(saved); setScreen('game'); }}>
                  ▶ Nastavi nedovršenu igru
                  <span className="small muted">
                    {MODE_NAMES[saved.config.mode]} · runda {saved.roundIndex + 1}/{saved.config.rounds.length} · {saved.players[0]}{' '}
                    {saved.scores[0]} : {saved.scores[1]} {saved.players[1]}
                  </span>
                </Button>
                <button className="link-btn danger" onClick={() => setConfirmDiscard(true)}>
                  Odustani od ove igre
                </button>
              </div>
            )}
            <Button big onClick={startTv} autoFocus>
              📺 Igraj na televizoru s mobitelima
            </Button>
            <Button big variant="secondary" onClick={() => { location.hash = 'mobitel'; }}>
              📱 Pridruži se s mobitela
            </Button>
            <Button variant="secondary" onClick={() => go('setup')}>
              Igra na jednom uređaju
            </Button>
            <Button variant="secondary" onClick={() => go('history')}>
              Povijest i statistika
            </Button>
            <Button variant="secondary" onClick={() => go('questions')}>
              Pitanja i paketi
            </Button>
            <Button variant="secondary" onClick={() => go('settings')}>
              Postavke
            </Button>
            <Button variant="ghost" onClick={() => go('help')}>
              Kako se igra
            </Button>
          </div>
        </div>
      );
  }

  return (
    <SettingsContext.Provider value={settings}>
      <RemoteContext.Provider value={screen === 'game' || screen === 'tv' ? host : null}>{content}</RemoteContext.Provider>
      {confirmDiscard && (
        <Confirm
          title="Odustati od nedovršene igre?"
          text="Nedovršeni dvoboj bit će obrisan i neće se upisati u povijest. Ovo se ne može poništiti."
          confirmLabel="Odustani od igre"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => void discardSaved()}
        />
      )}
      {pendingStart && (
        <Confirm
          title="Započeti novi dvoboj?"
          text="Postoji nedovršena igra. Ako započnete novi dvoboj, nedovršena igra bit će odbačena."
          confirmLabel="Započni novi"
          onCancel={() => setPendingStart(null)}
          onConfirm={() => {
            const m = pendingStart;
            setPendingStart(null);
            setSaved(null);
            void begin(m);
          }}
        />
      )}
    </SettingsContext.Provider>
  );
}
