import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSyncStatus, onSyncChange, syncNow } from '../db/sync';

/** Mala oznaka stanja usklađivanja sa zajedničkom bazom. */
export default function SyncBadge() {
  const s = useSyncExternalStore(onSyncChange, getSyncStatus);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const needsPin = s.state === 'offline' && /^Usklađivanje nije uspjelo: 401/.test(s.message || '');
  const ago = s.at ? Math.max(0, Math.round((Date.now() - s.at) / 60000)) : null;
  const text =
    s.state === 'syncing'
      ? 'Usklađujem…'
      : s.state === 'ok'
        ? `Usklađeno ${ago === 0 ? 'upravo' : `prije ${ago} min`}`
        : needsPin
        ? '🔒 Upiši kućni PIN'
        : s.state === 'offline'
          ? 'Nije usklađeno – pokušaj ponovno'
          : 'Usklađivanje…';
  return (
    <button className={`sync-badge ${s.state}`} onClick={() => (needsPin ? window.dispatchEvent(new Event('zicer-pin-needed')) : void syncNow())} title={s.message || 'Pitanja, povijest i statistika dijele se između svih uređaja'}>
      ☁ {text}
    </button>
  );
}

/** Ponovno učitava podatke ekrana kad usklađivanje donese promjene. */
export function useDataRefresh(reload: () => void) {
  useEffect(() => {
    window.addEventListener('zicer-data', reload);
    return () => window.removeEventListener('zicer-data', reload);
  }, [reload]);
}
