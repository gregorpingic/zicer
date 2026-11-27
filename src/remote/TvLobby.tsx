import Rivalry from '../components/Rivalry';
import { useEffect, useState, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import type { BotLevel, DifficultySetting, GameMode, MatchState, Settings, Tempo } from '../core/types';
import { MODES, MODE_NAMES, STAKE_IDEAS } from '../core/gameInfo';
import { BOT_LEVEL_NAMES } from '../core/bot';
import { Button } from '../components/common';
import { Control } from './RemoteContext';
import type { RemoteHost } from './host';
import type { ControlButton } from './protocol';
import { joinUrl } from './protocol';
import { keepAwake } from './wakeLock';
import TvZoomButtons from './TvZoomButtons';

type QuickMode = Exclude<GameMode, 'prilagodjeni'>;

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

const MODE_LIST: QuickMode[] = ['brzi', 'standardni', 'veliki'];
const DIFFS: { v: DifficultySetting; label: string }[] = [
  { v: 'sve', label: 'Mješovito' },
  { v: 'lako', label: 'Lako' },
  { v: 'srednje', label: 'Srednje' },
  { v: 'tesko', label: 'Teško' },
];
const TEMPOS: Tempo[] = ['opusteno', 'normalno', 'brzo', 'bez'];
const TEMPO_NAMES: Record<Tempo, string> = { opusteno: 'Opušteno', normalno: 'Normalno', brzo: 'Brzo', bez: 'Bez ograničenja' };
const LEVELS: BotLevel[] = ['lako', 'srednje', 'tesko'];
const next = <T,>(list: T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length];

/** Televizor: kod/QR za spajanje mobitela, postavke dvoboja i početak igre. */
export default function TvLobby({
  host,
  saved,
  settings,
  onSettings,
  onStart,
  onResume,
  onDiscard,
  onBack,
}: {
  host: RemoteHost;
  saved: MatchState | null;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onStart: (mode: QuickMode, vsBot: boolean) => void;
  onResume: () => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const [qr, setQr] = useState('');
  const [mode, setMode] = useState<QuickMode>('standardni');
  const [vsBot, setVsBot] = useState(false);
  const url = joinUrl(host.code);
  const snapshot = useSyncExternalStore(
    (cb) => host.onChange(cb),
    () => `${host.status}|${host.error}|${host.connected().join()}`,
  );
  const connected = host.connected();
  const anyone = connected[0] || connected[1];
  const both = connected[0] && connected[1];

  useEffect(() => {
    void QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0e0b0a', light: '#f6efe6' } }).then(setQr);
  }, [url]);
  useEffect(() => keepAwake(), []);
  useEffect(() => {
    host.setInfo({ inGame: false, title: 'Postavke dvoboja', subtitle: undefined, paused: false, scores: [0, 0], players: settings.players });
  }, [host, settings.players]);

  const set = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch });
  const canStart = vsBot ? anyone : both;
  const start = () => onStart(mode, vsBot);

  const opponent = vsBot ? `Računalo (${BOT_LEVEL_NAMES[settings.botLevel].toLowerCase()})` : 'Drugi igrač';
  const rows: { id: string; label: string; value: string; act: () => void }[] = [
    { id: 'mode', label: 'Način', value: `${MODES[mode].name} · ${MODES[mode].duration}`, act: () => setMode(next(MODE_LIST, mode)) },
    {
      id: 'opp',
      label: 'Protivnik',
      value: opponent,
      act: () => {
        // Drugi igrač → Računalo lako → srednje → teško → Drugi igrač
        if (!vsBot) {
          setVsBot(true);
          set({ botLevel: 'lako' });
        } else if (settings.botLevel === 'tesko') setVsBot(false);
        else set({ botLevel: next(LEVELS, settings.botLevel) });
      },
    },
    { id: 'mixed', label: 'Miješana pitanja', value: settings.mixed ? 'Da – svako pitanje druga igra' : 'Ne – runda po runda', act: () => set({ mixed: !settings.mixed }) },
    {
      id: 'diff',
      label: 'Težina pitanja',
      value: DIFFS.find((d) => d.v === settings.difficulty)!.label,
      act: () => set({ difficulty: next(DIFFS.map((d) => d.v), settings.difficulty) }),
    },
    { id: 'time', label: 'Tempo', value: TEMPO_NAMES[settings.tempo ?? 'normalno'], act: () => set({ tempo: next(TEMPOS, settings.tempo ?? 'normalno') }) },
    { id: 'auto', label: 'Automatski nastavak', value: settings.autoNext ? 'Da' : 'Ne', act: () => set({ autoNext: !settings.autoNext }) },
    {
      id: 'stake',
      label: 'Ulog',
      value: settings.stake || 'bez uloga',
      act: () => set({ stake: next(['', ...STAKE_IDEAS], STAKE_IDEAS.includes(settings.stake) ? settings.stake : '') }),
    },
    { id: 'jokers', label: 'Džokeri', value: settings.jokers ? 'Da' : 'Ne', act: () => set({ jokers: !settings.jokers }) },
    { id: 'speed', label: 'Brzinski bonus', value: settings.speedBonus ? 'Da' : 'Ne', act: () => set({ speedBonus: !settings.speedBonus }) },
  ];

  const phoneButtons: ControlButton[] = [
    ...(canStart ? [{ id: 'start', label: '▶ Započni dvoboj' }] : []),
    ...(saved ? [{ id: 'resume', label: '▶ Nastavi nedovršenu igru', variant: 'secondary' as const }] : []),
    ...rows.map((r) => ({ id: r.id, label: `${r.label}: ${r.value}  ⟳`, variant: 'secondary' as const })),
    ...(saved ? [{ id: 'discard', label: 'Odustani od nedovršene igre', variant: 'ghost' as const }] : []),
  ];
  const choose = (id?: string) => {
    if (id === 'start') start();
    else if (id === 'resume') onResume();
    else if (id === 'discard') onDiscard();
    else rows.find((r) => r.id === id)?.act();
  };

  return (
    <div className="tv-lobby" data-snapshot={snapshot}>
      <div className="tv-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <div className="row">
          <TvZoomButtons />
          <Button variant="ghost" onClick={toggleFullscreen}>
            ⛶ Cijeli zaslon
          </Button>
        </div>
      </div>

      <div className="tv-columns">
        <section className="tv-join-card">
          <Rivalry players={settings.players} className="tv-rivalry" />
          <h1 className="tv-title">Spojite mobitele</h1>
          <div className="tv-join">
            <div className="tv-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR kod za spajanje" />
            <div className="tv-steps">
              <p>Skenirajte QR kod kamerom mobitela ili upišite kod u Zicer → Pridruži se s mobitela:</p>
              <div className="tv-code">{host.code}</div>
              <div className="tv-status">
                {host.status === 'ready' ? (
                  <span className="good-text">● Spremno za spajanje</span>
                ) : (
                  <span className="muted">○ Otvaram sobu… {host.error}</span>
                )}
              </div>
            </div>
          </div>
          <div className="tv-players">
            {([0, 1] as const).map((p) => (
              <div key={p} className={`tv-player p${p} ${connected[p] ? 'on' : ''}`}>
                <span className="tv-player-name">{vsBot && p === 1 && !connected[1] ? settings.botName : settings.players[p]}</span>
                <span>{connected[p] ? '📱 spojen/a' : vsBot && p === 1 ? '🤖 računalo' : 'čeka se…'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="tv-settings">
          <h2>Postavke dvoboja</h2>
          <div className="tv-setting-list">
            {rows.map((r) => (
              <button key={r.id} className="tv-setting" onClick={r.act}>
                <span className="tv-setting-label">{r.label}</span>
                <span className="tv-setting-value">{r.value}</span>
              </button>
            ))}
          </div>
          {saved && (
            <div className="muted small tv-saved">
              Nedovršena igra: {MODE_NAMES[saved.config.mode]} · runda {saved.roundIndex + 1}/{saved.config.rounds.length} ·{' '}
              {saved.players[0]} {saved.scores[0]} : {saved.scores[1]} {saved.players[1]}
            </div>
          )}
          <Control spec={anyone ? { for: 'any', kind: 'buttons', title: 'Postavke dvoboja (dodirni za promjenu)', buttons: phoneButtons } : null} onSubmit={(v) => choose(v.button)}>
            <div className="row center tv-actions">
              <Button big onClick={start}>
                ▶ Započni dvoboj
              </Button>
              {saved && (
                <>
                  <Button variant="secondary" onClick={onResume}>
                    Nastavi nedovršenu
                  </Button>
                  <Button variant="ghost" onClick={onDiscard}>
                    Odustani od nedovršene
                  </Button>
                </>
              )}
            </div>
          </Control>
          {anyone && !canStart && <div className="muted center small">Čeka se drugi igrač – ili odaberite protivnika „Računalo”.</div>}
        </section>
      </div>
    </div>
  );
}
