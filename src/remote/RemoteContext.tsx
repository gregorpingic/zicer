import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlayerIndex } from '../core/types';
import type { BotPlayer } from '../core/bot';
import type { RemoteHost } from './host';
import type { ControlSpec, ControlValue } from './protocol';

/**
 * Tko odgovara na kontrole igre:
 * - host: mobiteli spojeni na televizor (null = sve na ovom uređaju),
 * - bot: računalo kao protivnik (null = dva stvarna igrača).
 */
export interface ControlHub {
  host: RemoteHost | null;
  bot: BotPlayer | null;
  players: [string, string];
}

export const RemoteContext = createContext<ControlHub>({ host: null, bot: null, players: ['', ''] });

export function useHub(): ControlHub {
  return useContext(RemoteContext);
}
export function useRemoteHost(): RemoteHost | null {
  return useContext(RemoteContext).host;
}

/** 'local' – sučelje na ovom ekranu, 'remote' – na mobitelu, 'bot' – odgovara računalo, 'hidden' – nitko. */
export type ControlMode = 'local' | 'remote' | 'bot' | 'hidden';

/** Kontrola nakon primjene pravila za igru protiv računala. */
export function routeSpec(spec: ControlSpec | null, bot: BotPlayer | null): { spec: ControlSpec | null; bot: boolean; hidden: boolean } {
  if (!spec || !bot || spec.for !== bot.player) return { spec, bot: false, hidden: false };
  if (spec.role === 'objection') return { spec, bot: false, hidden: true };
  // Procjenu tuđeg odgovora računalo ne može dati – prepušta se čovjeku.
  if (spec.role === 'judge') return { spec: { ...spec, for: (1 - bot.player) as PlayerIndex }, bot: false, hidden: false };
  return { spec, bot: true, hidden: false };
}

/**
 * Prijavljuje kontrolu mobitelima ili računalu dok je komponenta prikazana.
 * Nakon svakog odgovora kontrola se ponovno prijavljuje (npr. sljedeći pokušaj u istoj igri).
 */
export function useControl(spec: ControlSpec | null, onSubmit: (v: ControlValue) => void): ControlMode {
  const { host, bot } = useHub();
  const handler = useRef(onSubmit);
  handler.current = onSubmit;
  const [gen, setGen] = useState(0);
  const routed = routeSpec(spec, bot);
  const key = routed.spec ? JSON.stringify(routed.spec) : '';
  const mode: ControlMode = !routed.spec ? 'local' : routed.hidden ? 'hidden' : routed.bot ? 'bot' : host ? 'remote' : 'local';

  useEffect(() => {
    if (!key || (mode !== 'remote' && mode !== 'bot')) return;
    const s = JSON.parse(key) as ControlSpec;
    if (mode === 'bot') {
      const t = window.setTimeout(() => {
        const v = bot!.decide(s);
        if (v) {
          handler.current(v);
          setGen((g) => g + 1);
        }
      }, bot!.delay(s));
      return () => window.clearTimeout(t);
    }
    const id = host!.register(s, (v) => {
      handler.current(v);
      setGen((g) => g + 1);
    });
    return () => host!.unregister(id);
  }, [host, bot, key, mode, gen]);
  return mode;
}

/**
 * Omotač oko ulaznog dijela igre. Na jednom uređaju prikazuje normalno sučelje;
 * kad odgovara mobitel ili računalo, prikazuje samo tko je na potezu
 * (uz mogućnost da se, osim kod tajnih unosa, odgovori i na samom ekranu).
 */
export function Control({
  spec,
  onSubmit,
  children,
  display,
  silent,
}: {
  spec: ControlSpec | null;
  onSubmit: (v: ControlValue) => void;
  children?: ReactNode;
  /** Što ekran prikazuje dok igrač odgovara na mobitelu (npr. ponuđene odgovore). */
  display?: ReactNode;
  /** Ne prikazuj oznaku "odgovara na mobitelu" (sporedna kontrola). */
  silent?: boolean;
}) {
  const mode = useControl(spec, onSubmit);
  const { players, bot } = useHub();
  const [local, setLocal] = useState(false);
  const routed = routeSpec(spec, bot).spec;
  if (mode === 'hidden') return null;
  if (mode === 'local' || !routed) return <>{children}</>;
  if (mode === 'remote' && local && !routed.secret) return <>{children}</>;
  if (silent) return <>{display}</>;
  const isBot = mode === 'bot';
  const who =
    routed.for === 'any' ? 'Nastavite na mobitelu' : isBot ? `${players[routed.for]} razmišlja…` : `${players[routed.for]} odgovara na mobitelu`;
  return (
    <>
      {display}
      <div className={`phone-wait ${routed.for === 'any' ? '' : `p${routed.for}`} ${isBot ? 'bot' : ''}`}>
        <span className="phone-icon" aria-hidden>
          {isBot ? '🤖' : '📱'}
        </span>
        <span>{who}</span>
        {!isBot && !routed.secret && children && (
          <button className="link-btn small" onClick={() => setLocal(true)}>
            odgovori ovdje
          </button>
        )}
      </div>
    </>
  );
}
