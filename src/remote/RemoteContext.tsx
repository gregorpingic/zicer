import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { RemoteHost } from './host';
import type { ControlSpec, ControlValue } from './protocol';

export const RemoteContext = createContext<RemoteHost | null>(null);

/** Je li igra u načinu "televizor + mobiteli". */
export function useRemoteHost(): RemoteHost | null {
  return useContext(RemoteContext);
}

/**
 * Prijavljuje kontrolu mobitelima dok je komponenta prikazana.
 * Nakon svakog odgovora kontrola se ponovno prijavljuje (npr. sljedeći pokušaj u istoj igri).
 * Vraća true ako je aktivan način s mobitelima.
 */
export function useControl(spec: ControlSpec | null, onSubmit: (v: ControlValue) => void): boolean {
  const host = useRemoteHost();
  const handler = useRef(onSubmit);
  handler.current = onSubmit;
  const [gen, setGen] = useState(0);
  const key = spec ? JSON.stringify(spec) : '';
  useEffect(() => {
    if (!host || !key) return;
    const id = host.register(JSON.parse(key) as ControlSpec, (v) => {
      handler.current(v);
      setGen((g) => g + 1);
    });
    return () => host.unregister(id);
  }, [host, key, gen]);
  return !!host;
}

/**
 * Omotač oko ulaznog dijela igre. Na jednom uređaju prikazuje normalno sučelje;
 * u načinu s mobitelima na televizoru prikazuje samo tko je na potezu na mobitelu,
 * uz mogućnost da se (osim kod tajnih unosa) odgovori i na samom televizoru.
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
  /** Što televizor prikazuje dok igrač odgovara na mobitelu (npr. ponuđene odgovore). */
  display?: ReactNode;
  /** Ne prikazuj oznaku "odgovara na mobitelu" (sporedna kontrola). */
  silent?: boolean;
}) {
  const remote = useControl(spec, onSubmit);
  const host = useRemoteHost();
  const [local, setLocal] = useState(false);
  if (!remote || !spec) return <>{children}</>;
  if (local && !spec.secret) return <>{children}</>;
  if (silent) return <>{display}</>;
  const who = spec.for === 'any' ? 'Nastavite na mobitelu' : `${host!.players[spec.for]} odgovara na mobitelu`;
  return (
    <>
    {display}
    <div className={`phone-wait ${spec.for === 'any' ? '' : `p${spec.for}`}`}>
      <span className="phone-icon" aria-hidden>
        📱
      </span>
      <span>{who}</span>
      {!spec.secret && children && (
        <button className="link-btn small" onClick={() => setLocal(true)}>
          odgovori ovdje
        </button>
      )}
    </div>
    </>
  );
}
