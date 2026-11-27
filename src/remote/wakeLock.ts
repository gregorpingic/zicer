// Sprječava gašenje ekrana dok je igra otvorena (gdje preglednik to podržava).

export function keepAwake(): () => void {
  type Sentinel = { release: () => Promise<void> };
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
  if (!nav.wakeLock) return () => undefined;
  let lock: Sentinel | null = null;
  let active = true;
  const acquire = () => {
    if (!active || document.visibilityState !== 'visible') return;
    nav.wakeLock!.request('screen').then((l) => (lock = l)).catch(() => undefined);
  };
  acquire();
  document.addEventListener('visibilitychange', acquire);
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', acquire);
    void lock?.release().catch(() => undefined);
  };
}
