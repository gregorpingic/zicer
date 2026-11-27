import Peer, { type DataConnection } from 'peerjs';
import type { PlayerIndex } from '../core/types';
import {
  PEER_PREFIX,
  type ControlSpec,
  type ControlValue,
  type HostMessage,
  type PhoneCommand,
  type PhoneInfo,
  type PhoneMessage,
} from './protocol';

export type HostStatus = 'connecting' | 'ready' | 'error';

interface Registered {
  spec: ControlSpec;
  handler: (v: ControlValue) => void;
}

/**
 * Televizor kao domaćin: drži vezu s mobitelima (WebRTC preko PeerJS), prosljeđuje im
 * trenutačno dostupne kontrole i prima njihove odgovore. Igra se i dalje vodi samo na televizoru.
 */
export class RemoteHost {
  readonly code: string;
  status: HostStatus = 'connecting';
  error = '';
  private peer: Peer | null = null;
  private conns = new Map<DataConnection, PlayerIndex | null>();
  private controls = new Map<string, Registered>();
  private nextId = 1;
  private info: PhoneInfo;
  private listeners = new Set<() => void>();
  private cmdListeners = new Set<(c: PhoneCommand, player: PlayerIndex) => void>();
  private scheduled = false;
  private destroyed = false;
  private retryTimer: number | undefined;

  constructor(code: string, players: [string, string]) {
    this.code = code;
    this.info = { players, scores: [0, 0], title: 'Čeka se početak dvoboja', paused: false, inGame: false };
    this.open();
  }

  private open() {
    if (this.destroyed) return;
    const peer = new Peer(PEER_PREFIX + this.code, { debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      this.status = 'ready';
      this.error = '';
      this.emit();
    });
    peer.on('connection', (conn) => this.accept(conn));
    peer.on('disconnected', () => {
      if (!this.destroyed && !peer.destroyed) peer.reconnect();
    });
    peer.on('error', (e: { type?: string; message?: string }) => {
      if (e.type === 'unavailable-id' || e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') {
        // ID je možda još zauzet od prethodnog učitavanja stranice – pokušaj ponovno.
        this.status = 'connecting';
        this.error = e.type === 'unavailable-id' ? 'Soba se ponovno otvara…' : 'Nema veze s poslužiteljem za spajanje – provjerite internet.';
        this.emit();
        peer.destroy();
        window.clearTimeout(this.retryTimer);
        this.retryTimer = window.setTimeout(() => this.open(), 3000);
      } else if (e.type !== 'peer-unavailable') {
        this.error = e.message || String(e.type);
        this.emit();
      }
    });
  }

  private accept(conn: DataConnection) {
    conn.on('open', () => {
      this.conns.set(conn, null);
      this.send(conn, { type: 'hello', players: this.info.players, taken: this.taken() });
      this.emit();
    });
    conn.on('data', (raw) => this.onMessage(conn, raw as PhoneMessage));
    const drop = () => {
      this.conns.delete(conn);
      this.emit();
      this.scheduleBroadcast();
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  private onMessage(conn: DataConnection, msg: PhoneMessage) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'join') {
      const p = msg.player === 1 ? 1 : 0;
      // Isti igrač s novog uređaja preuzima mjesto starog.
      for (const [c, cp] of this.conns) {
        if (c !== conn && cp === p) {
          this.send(c, { type: 'kicked', reason: 'Igrač se spojio s drugog uređaja.' });
          this.conns.set(c, null);
        }
      }
      this.conns.set(conn, p);
      this.send(conn, { type: 'joined', player: p });
      this.emit();
      this.scheduleBroadcast();
      return;
    }
    const player = this.conns.get(conn);
    if (player === null || player === undefined) return;
    if (msg.type === 'submit') {
      const reg = this.controls.get(msg.id);
      if (!reg) return; // zastarjela kontrola
      if (reg.spec.for !== 'any' && reg.spec.for !== player) return;
      this.controls.delete(msg.id);
      this.scheduleBroadcast();
      reg.handler(msg.value || {});
    } else if (msg.type === 'cmd') {
      const { type: _t, ...cmd } = msg;
      this.cmdListeners.forEach((l) => l(cmd as PhoneCommand, player));
    }
  }

  private send(conn: DataConnection, msg: HostMessage) {
    try {
      if (conn.open) void conn.send(msg);
    } catch {
      /* veza je prekinuta */
    }
  }

  private taken(): [boolean, boolean] {
    const t: [boolean, boolean] = [false, false];
    for (const p of this.conns.values()) if (p !== null) t[p] = true;
    return t;
  }

  /** Premješta spojeni mobitel s jednog mjesta igrača na drugo (igra protiv računala). */
  movePlayer(from: PlayerIndex, to: PlayerIndex) {
    for (const [c, p] of this.conns) {
      if (p === from) {
        this.conns.set(c, to);
        this.send(c, { type: 'joined', player: to });
      }
    }
    this.emit();
    this.scheduleBroadcast();
  }

  /** Koji su igrači spojeni. */
  connected(): [boolean, boolean] {
    return this.taken();
  }

  register(spec: ControlSpec, handler: (v: ControlValue) => void): string {
    const id = `c${this.nextId++}`;
    this.controls.set(id, { spec, handler });
    this.scheduleBroadcast();
    return id;
  }

  unregister(id: string) {
    if (this.controls.delete(id)) this.scheduleBroadcast();
  }

  setInfo(info: Partial<PhoneInfo>) {
    this.info = { ...this.info, ...info };
    this.scheduleBroadcast();
  }

  get players(): [string, string] {
    return this.info.players;
  }

  private scheduleBroadcast() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.broadcast();
    });
  }

  private broadcast() {
    const list = [...this.controls.entries()];
    for (const [conn, p] of this.conns) {
      if (p === null) {
        this.send(conn, { type: 'hello', players: this.info.players, taken: this.taken() });
        continue;
      }
      const controls = list.filter(([, r]) => r.spec.for === 'any' || r.spec.for === p).map(([id, r]) => ({ ...r.spec, id }));
      this.send(conn, { type: 'state', info: this.info, controls });
    }
  }

  onChange(l: () => void): () => void {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }
  onCommand(l: (c: PhoneCommand, player: PlayerIndex) => void): () => void {
    this.cmdListeners.add(l);
    return () => void this.cmdListeners.delete(l);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  destroy() {
    this.destroyed = true;
    window.clearTimeout(this.retryTimer);
    this.peer?.destroy();
  }
}
