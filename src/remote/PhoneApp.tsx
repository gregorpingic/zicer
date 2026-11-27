import { useEffect, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import type { PlayerIndex } from '../core/types';
import { parseNumber } from '../components/common';
import {
  PEER_PREFIX,
  normalizeCode,
  type ControlButton,
  type ControlSpec,
  type ControlValue,
  type HostMessage,
  type PhoneInfo,
  type PhoneMessage,
} from './protocol';
import { keepAwake } from './wakeLock';

type Status = 'code' | 'connecting' | 'choose' | 'play' | 'kicked';
type Ctl = ControlSpec & { id: string };

const STORE = 'zicer-mobitel';
interface Saved {
  code: string;
  player?: PlayerIndex;
}
const loadSaved = (): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null');
  } catch {
    return null;
  }
};
const save = (s: Saved) => localStorage.setItem(STORE, JSON.stringify(s));

function codeFromHash(): string {
  const m = location.hash.match(/mobitel=([A-Za-z0-9]+)/);
  return m ? normalizeCode(m[1]) : '';
}

/** Mobitel kao upravljač: prikazuje samo ono što igrač trenutačno treba odabrati ili upisati. */
export default function PhoneApp({ onLeave }: { onLeave: () => void }) {
  const initialCode = codeFromHash() || loadSaved()?.code || '';
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<Status>(initialCode ? 'connecting' : 'code');
  const [players, setPlayers] = useState<[string, string]>(['Igrač 1', 'Igrač 2']);
  const [taken, setTaken] = useState<[boolean, boolean]>([false, false]);
  const [me, setMe] = useState<PlayerIndex | null>(null);
  const [info, setInfo] = useState<PhoneInfo | null>(null);
  const [controls, setControls] = useState<Ctl[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const conn = useRef<DataConnection | null>(null);
  const peer = useRef<Peer | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const send = (m: PhoneMessage) => {
    if (conn.current?.open) void conn.current.send(m);
  };

  // Spajanje i automatsko ponovno spajanje.
  useEffect(() => {
    if (status === 'code' || status === 'kicked' || !code) return;
    let stopped = false;
    let retry: number | undefined;
    const p = new Peer({ debug: 0 });
    peer.current = p;
    const connect = () => {
      if (stopped) return;
      const c = p.connect(PEER_PREFIX + code, { serialization: 'json', reliable: true });
      conn.current = c;
      const failTimer = window.setTimeout(() => {
        if (!c.open) {
          c.close();
          setError('Televizor se ne javlja. Provjerite kod i je li na televizoru otvoren Zicer.');
          retry = window.setTimeout(connect, 2500);
        }
      }, 8000);
      c.on('open', () => {
        window.clearTimeout(failTimer);
        setError('');
      });
      c.on('data', (raw) => {
        const msg = raw as HostMessage;
        if (msg.type === 'hello') {
          setPlayers(msg.players);
          setTaken(msg.taken);
          const saved = loadSaved();
          if (saved?.code === code && saved.player !== undefined) send({ type: 'join', player: saved.player });
          else setStatus('choose');
        } else if (msg.type === 'joined') {
          setMe(msg.player);
          save({ code, player: msg.player });
          setStatus('play');
        } else if (msg.type === 'state') {
          setInfo(msg.info);
          setPlayers(msg.info.players);
          setControls(msg.controls);
          setSent((prev) => new Set([...prev].filter((id) => msg.controls.some((c) => c.id === id))));
          if (msg.controls.some((c) => !seenIds.current.has(c.id) && c.for !== 'any')) navigator.vibrate?.(60);
          msg.controls.forEach((c) => seenIds.current.add(c.id));
        } else if (msg.type === 'kicked') {
          setError(msg.reason);
          setStatus('kicked');
        }
      });
      c.on('close', () => {
        if (stopped) return;
        setError('Veza s televizorom je prekinuta – ponovno spajanje…');
        retry = window.setTimeout(connect, 2000);
      });
      c.on('error', () => undefined);
    };
    p.on('open', connect);
    p.on('disconnected', () => !stopped && !p.destroyed && p.reconnect());
    p.on('error', (e: { type?: string }) => {
      if (e.type === 'peer-unavailable') {
        setError('Televizor s tim kodom nije pronađen. Provjerite kod – pokušavam ponovno…');
        retry = window.setTimeout(connect, 3000);
      } else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') {
        setError('Nema interneta ili poslužitelj za spajanje nije dostupan.');
      }
    });
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      p.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, status === 'code' || status === 'kicked']);

  useEffect(() => keepAwake(), []);

  const submit = (c: Ctl, value: ControlValue) => {
    setSent((s) => new Set(s).add(c.id));
    send({ type: 'submit', id: c.id, value });
  };

  if (status === 'code' || status === 'kicked') return <CodeEntry initial={code} error={status === 'kicked' ? error : ''} onSubmit={(c) => { setCode(c); save({ code: c }); setError(''); setStatus('connecting'); }} onLeave={onLeave} />;

  if (status === 'connecting')
    return (
      <div className="phone">
        <div className="phone-center">
          <div className="phone-logo">Zicer</div>
          <div className="phone-big">Spajanje na televizor…</div>
          <div className="muted">Kod: {code}</div>
          {error && <div className="msg msg-info">{error}</div>}
          <button className="btn btn-ghost" onClick={() => setStatus('code')}>
            Promijeni kod
          </button>
        </div>
      </div>
    );

  if (status === 'choose')
    return (
      <div className="phone">
        <div className="phone-center">
          <div className="phone-logo">Zicer</div>
          <div className="phone-big">Tko si ti?</div>
          {([0, 1] as const).map((p) => (
            <button key={p} className={`btn btn-big phone-who p${p}`} onClick={() => send({ type: 'join', player: p })}>
              {players[p]}
              {taken[p] && <span className="small muted"> (preuzmi s drugog uređaja)</span>}
            </button>
          ))}
          <p className="muted small">Imena se mijenjaju u postavkama na televizoru.</p>
        </div>
      </div>
    );

  const mine = controls.filter((c) => !sent.has(c.id));
  const own = mine.filter((c) => c.for !== 'any');
  const shared = mine.filter((c) => c.for === 'any');
  const waitingSecret = controls.some((c) => sent.has(c.id) && c.secret);

  return (
    <div className="phone">
      <header className="phone-head">
        {info &&
          ([0, 1] as const).map((p) => (
            <div key={p} className={`phone-score p${p} ${me === p ? 'me' : ''}`}>
              <span className="phone-score-name">{info.players[p]}</span>
              <span className="phone-score-val">{info.scores[p]}</span>
            </div>
          ))}
        <button className="phone-menu-btn" onClick={() => setMenu(!menu)} aria-label="Izbornik">
          ⋯
        </button>
      </header>
      {info && (
        <div className="phone-round">
          {info.title}
          {info.subtitle ? ` · ${info.subtitle}` : ''}
        </div>
      )}
      {error && <div className="msg msg-info">{error}</div>}
      {menu && (
        <PhoneMenu
          info={info}
          players={players}
          onCmd={(m) => {
            send(m);
            setMenu(false);
          }}
          onSwitch={() => {
            save({ code });
            setMenu(false);
            setStatus('choose');
          }}
          onLeave={() => {
            localStorage.removeItem(STORE);
            onLeave();
          }}
        />
      )}
      {info?.paused && <div className="phone-paused">Pauza</div>}
      <main className="phone-body">
        {[...own, ...shared].map((c) => (
          <ControlView key={c.id} c={c} paused={!!info?.paused} onSubmit={(v) => submit(c, v)} />
        ))}
        {mine.length === 0 && (
          <div className="phone-idle">
            {info?.question && <div className="phone-idle-q">{info.question}</div>}
            <div className="phone-idle-icon">{waitingSecret ? '🔒' : '⏳'}</div>
            <div>{waitingSecret ? 'Odgovor je zaključan. Čeka se drugi igrač.' : info?.turn || 'Čekaj svoj red'}</div>
          </div>
        )}
      </main>
    </div>
  );
}

function CodeEntry({ initial, error, onSubmit, onLeave }: { initial: string; error: string; onSubmit: (c: string) => void; onLeave: () => void }) {
  const [v, setV] = useState(initial);
  const c = normalizeCode(v);
  return (
    <div className="phone">
      <form
        className="phone-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (c.length >= 4) onSubmit(c);
        }}
      >
        <div className="phone-logo">Zicer</div>
        <div className="phone-big">Upiši kod s televizora</div>
        {error && <div className="msg msg-bad">{error}</div>}
        <input
          className="big-input code-input"
          value={v}
          onChange={(e) => setV(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          placeholder="KOD"
          aria-label="Kod sobe"
        />
        <button className="btn btn-primary btn-big" type="submit" disabled={c.length < 4}>
          Spoji se
        </button>
        <button className="btn btn-ghost" type="button" onClick={onLeave}>
          Natrag
        </button>
      </form>
    </div>
  );
}

function PhoneMenu({
  info,
  players,
  onCmd,
  onSwitch,
  onLeave,
}: {
  info: PhoneInfo | null;
  players: [string, string];
  onCmd: (m: PhoneMessage) => void;
  onSwitch: () => void;
  onLeave: () => void;
}) {
  const [confirmSkip, setConfirmSkip] = useState(false);
  return (
    <div className="phone-menu">
      {info?.inGame && (
        <>
          <button className="btn btn-secondary" onClick={() => onCmd({ type: 'cmd', cmd: info.paused ? 'resume' : 'pause' })}>
            {info.paused ? '▶ Nastavi' : '⏸ Pauza'}
          </button>
          {!confirmSkip ? (
            <button className="btn btn-secondary" onClick={() => setConfirmSkip(true)}>
              ⏭ Preskoči pitanje
            </button>
          ) : (
            <button className="btn btn-danger" onClick={() => onCmd({ type: 'cmd', cmd: 'skip' })}>
              Sigurno preskoči?
            </button>
          )}
          <div className="phone-adjust">
            <div className="muted small">Ručna korekcija bodova</div>
            {([0, 1] as const).map((p) => (
              <div key={p} className="row">
                <span className={`ptag p${p}`}>{players[p]}</span>
                {[-5, 5].map((d) => (
                  <button key={d} className={`btn ${d < 0 ? 'btn-bad' : 'btn-good'}`} onClick={() => onCmd({ type: 'cmd', cmd: 'adjust', player: p, delta: d })}>
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="phone-adjust">
        <div className="muted small">Veličina prikaza na televizoru</div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => onCmd({ type: 'cmd', cmd: 'zoom', delta: -0.1 })}>
            A− manje
          </button>
          <button className="btn btn-secondary" onClick={() => onCmd({ type: 'cmd', cmd: 'zoom', delta: 0.1 })}>
            A+ veće
          </button>
        </div>
      </div>
      <button className="btn btn-ghost" onClick={onSwitch}>
        Promijeni igrača
      </button>
      <button className="btn btn-ghost" onClick={onLeave}>
        Odspoji se
      </button>
    </div>
  );
}

function Buttons({ c, onSubmit }: { c: { buttons?: ControlButton[] }; onSubmit: (v: ControlValue) => void }) {
  if (!c.buttons?.length) return null;
  return (
    <div className="phone-buttons">
      {c.buttons.map((b) => (
        <button key={b.id} className={`btn btn-${b.variant || 'primary'} btn-big`} onClick={() => onSubmit({ button: b.id })}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

/** Odbrojavanje na mobitelu (televizor je mjerodavan; ovo je samo prikaz). */
function PhoneCountdown({ seconds, paused }: { seconds: number; paused: boolean }) {
  const [left, setLeft] = useState(seconds * 1000);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      setLeft((l) => Math.max(0, l - (now - last)));
      last = now;
    }, 200);
    return () => window.clearInterval(id);
  }, [paused]);
  const sec = Math.ceil(left / 1000);
  return (
    <div className={`phone-timer ${sec <= 5 ? 'low' : ''}`} role="timer">
      <span className="phone-timer-num">{sec}</span>
      <div className="phone-timer-bar">
        <div className="phone-timer-fill" style={{ transform: `scaleX(${left / (seconds * 1000)})` }} />
      </div>
    </div>
  );
}

function ControlView({ c, paused, onSubmit }: { c: Ctl; paused: boolean; onSubmit: (v: ControlValue) => void }) {
  return (
    <section className={`phone-ctl ${c.secret ? 'secret' : ''}`}>
      {c.timer ? <PhoneCountdown seconds={c.timer} paused={paused} /> : null}
      {c.secret && <div className="phone-secret-tag">🔒 Tajni odgovor – vidiš ga samo ti</div>}
      {c.title && <div className="phone-title">{c.title}</div>}
      {c.lines?.length ? (
        <ul className="phone-lines">
          {c.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
      {c.note && <div className="msg msg-info">{c.note}</div>}
      <ControlBody c={c} onSubmit={onSubmit} />
    </section>
  );
}

function ControlBody({ c, onSubmit }: { c: Ctl; onSubmit: (v: ControlValue) => void }) {
  const [text, setText] = useState('');
  const [multi, setMulti] = useState<string[]>(() => (c.kind === 'text' && c.multi ? Array(c.multi).fill('') : []));
  const [stake, setStake] = useState(c.kind === 'stake' ? Math.min(10, c.max) : 0);
  const [order, setOrder] = useState<number[]>(c.kind === 'order' ? c.items.map((_, i) => i) : []);

  switch (c.kind) {
    case 'buttons':
      return <Buttons c={c} onSubmit={onSubmit} />;
    case 'choice':
      return (
        <>
          <div className="phone-choices">
            {c.options.map((o, i) => (
              <button key={i} className="choice" disabled={c.disabled?.includes(i)} onClick={() => onSubmit({ choice: i })}>
                {c.options.length === 4 && <span className="choice-letter">{'ABCD'[i]}</span>}
                {o}
              </button>
            ))}
          </div>
          <Buttons c={c} onSubmit={onSubmit} />
        </>
      );
    case 'number': {
      const n = parseNumber(text);
      return (
        <form
          className="phone-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (n !== null) onSubmit({ number: n });
          }}
        >
          <div className="num-row">
            <input className="big-input" inputMode="decimal" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder={c.placeholder || 'Upiši broj'} />
            {c.unit && <span className="unit">{c.unit}</span>}
          </div>
          <button className="btn btn-primary btn-big" type="submit" disabled={n === null}>
            Zaključaj odgovor
          </button>
        </form>
      );
    }
    case 'text':
      if (c.multi)
        return (
          <form
            className="phone-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({ text: multi.map((x) => x.trim()).join('\n') });
            }}
          >
            {multi.map((v, i) => (
              <input
                key={i}
                className="big-input"
                autoComplete="off"
                value={v}
                placeholder={`${i + 1}. ${c.placeholder || 'odgovor'}`}
                onChange={(e) => setMulti(multi.map((x, k) => (k === i ? e.target.value : x)))}
              />
            ))}
            <button className="btn btn-primary btn-big" type="submit">
              {c.submitLabel || 'Pošalji'}
            </button>
            <Buttons c={c} onSubmit={onSubmit} />
          </form>
        );
      return (
        <form
          className="phone-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() || c.allowEmpty) onSubmit({ text: text.trim() });
          }}
        >
          <input className="big-input" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder={c.placeholder} />
          <button className="btn btn-primary btn-big" type="submit" disabled={!text.trim() && !c.allowEmpty}>
            {c.submitLabel || 'Pošalji'}
          </button>
          <Buttons c={c} onSubmit={onSubmit} />
        </form>
      );
    case 'stake': {
      const quick = [...new Set([0, Math.round(c.max / 4), Math.round(c.max / 2), c.max])];
      return (
        <div className="stake">
          <div className="muted">Tvoji bodovi: {c.score}</div>
          <div className="stake-val">{stake}</div>
          <input type="range" min={0} max={c.max} value={stake} onChange={(e) => setStake(Number(e.target.value))} aria-label="Ulog" />
          <div className="row center">
            {quick.map((n) => (
              <button key={n} className="btn btn-secondary" onClick={() => setStake(n)}>
                {n === c.max ? `Sve (${n})` : n}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-big" onClick={() => onSubmit({ number: stake })}>
            Zaključaj ulog
          </button>
        </div>
      );
    }
    case 'order': {
      const move = (from: number, to: number) => {
        if (to < 0 || to >= order.length) return;
        const a = [...order];
        const [x] = a.splice(from, 1);
        a.splice(to, 0, x);
        setOrder(a);
      };
      return (
        <>
          <ol className="order-list">
            {order.map((idx, pos) => (
              <li key={idx} className="order-item">
                <span className="order-pos">{pos + 1}</span>
                <span className="order-text">{c.items[idx]}</span>
                <span className="order-btns">
                  <button aria-label="Gore" onClick={() => move(pos, pos - 1)} disabled={pos === 0}>
                    ▲
                  </button>
                  <button aria-label="Dolje" onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1}>
                    ▼
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <button className="btn btn-primary btn-big" onClick={() => onSubmit({ order })}>
            Zaključaj poredak
          </button>
        </>
      );
    }
  }
}
