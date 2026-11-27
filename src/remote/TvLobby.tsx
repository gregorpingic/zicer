import { useEffect, useState, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import type { GameMode, MatchState } from '../core/types';
import { MODES, MODE_NAMES } from '../core/gameInfo';
import { Button } from '../components/common';
import { Control } from './RemoteContext';
import type { RemoteHost } from './host';
import { joinUrl } from './protocol';
import { keepAwake } from './wakeLock';

type QuickMode = Exclude<GameMode, 'prilagodjeni'>;

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

/** Televizor: prikazuje kod/QR za spajanje mobitela i pokreće dvoboj. */
export default function TvLobby({
  host,
  saved,
  onStart,
  onResume,
  onDiscard,
  onBack,
}: {
  host: RemoteHost;
  saved: MatchState | null;
  onStart: (mode: QuickMode) => void;
  onResume: () => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const [qr, setQr] = useState('');
  const url = joinUrl(host.code);
  // Ponovno iscrtavanje kad se netko spoji ili odspoji.
  const snapshot = useSyncExternalStore(
    (cb) => host.onChange(cb),
    () => `${host.status}|${host.error}|${host.connected().join()}`,
  );
  const connected = host.connected();

  useEffect(() => {
    void QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0e0b0a', light: '#f6efe6' } }).then(setQr);
  }, [url]);
  useEffect(() => keepAwake(), []);
  useEffect(() => {
    host.setInfo({ inGame: false, title: 'Odabir dvoboja', subtitle: undefined, paused: false, scores: [0, 0] });
  }, [host]);

  const both = connected[0] && connected[1];
  const modes = Object.keys(MODES) as QuickMode[];
  const buttons = [
    ...(saved ? [{ id: 'resume', label: '▶ Nastavi nedovršenu igru' }] : []),
    ...modes.map((m) => ({ id: m, label: `${MODES[m].name} (${MODES[m].duration})`, variant: 'secondary' as const })),
    ...(saved ? [{ id: 'discard', label: 'Odustani od nedovršene igre', variant: 'ghost' as const }] : []),
  ];
  const choose = (id: string) => {
    if (id === 'resume') onResume();
    else if (id === 'discard') onDiscard();
    else onStart(id as QuickMode);
  };

  return (
    <div className="tv-lobby" data-snapshot={snapshot}>
      <div className="tv-head">
        <Button variant="ghost" onClick={onBack}>
          ← Natrag
        </Button>
        <Button variant="ghost" onClick={toggleFullscreen}>
          ⛶ Cijeli zaslon
        </Button>
      </div>
      <h1 className="tv-title">Spojite mobitele</h1>
      <div className="tv-join">
        <div className="tv-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR kod za spajanje" />
        <div className="tv-steps">
          <ol>
            <li>Skenirajte QR kod kamerom mobitela</li>
            <li>
              ili otvorite Zicer na mobitelu → <strong>Pridruži se s mobitela</strong> i upišite kod:
            </li>
          </ol>
          <div className="tv-code">{host.code}</div>
          <div className="tv-status">
            {host.status === 'ready' ? (
              <span className="good-text">● Televizor je spreman za spajanje</span>
            ) : (
              <span className="muted">○ Otvaram sobu… {host.error}</span>
            )}
          </div>
        </div>
      </div>
      <div className="tv-players">
        {([0, 1] as const).map((p) => (
          <div key={p} className={`tv-player p${p} ${connected[p] ? 'on' : ''}`}>
            <span className="tv-player-name">{host.players[p]}</span>
            <span>{connected[p] ? '📱 spojen/a' : 'čeka se…'}</span>
          </div>
        ))}
      </div>
      {saved && (
        <div className="muted center">
          Nedovršena igra: {MODE_NAMES[saved.config.mode]} · runda {saved.roundIndex + 1}/{saved.config.rounds.length} ·{' '}
          {saved.players[0]} {saved.scores[0]} : {saved.scores[1]} {saved.players[1]}
        </div>
      )}
      <Control
        spec={both ? { for: 'any', kind: 'buttons', title: 'Odaberite dvoboj', buttons } : null}
        onSubmit={(v) => v.button && choose(v.button)}
      >
        <div className="tv-modes">
          <div className="muted center">{both ? 'Odaberite dvoboj na mobitelu ili ovdje:' : 'Kad se oba igrača spoje, dvoboj se bira na mobitelu.'}</div>
          <div className="row center">
            {buttons.map((b) => (
              <Button key={b.id} variant={b.variant ?? 'primary'} onClick={() => choose(b.id)}>
                {b.label}
              </Button>
            ))}
          </div>
        </div>
      </Control>
    </div>
  );
}
