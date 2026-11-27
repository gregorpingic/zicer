import { registerSW } from 'virtual:pwa-register';

// Nova verzija aplikacije primjenjuje se samo kad se ne igra: ponovno učitavanje usred dvoboja
// srušilo bi sobu na televizoru i odspojilo mobitele.
let busy = false;
let pending = false;
let update: ((reload?: boolean) => Promise<void>) | null = null;

function maybeApply() {
  if (pending && !busy && update) {
    pending = false;
    void update(true);
  }
}

/** true dok traje dvoboj ili je televizor u načinu s mobitelima. */
export function setBusy(b: boolean) {
  busy = b;
  maybeApply();
}

export function startUpdater() {
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      maybeApply();
    },
    onRegisteredSW(_url, r) {
      if (!r) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void r.update();
      });
      window.setInterval(() => void r.update(), 30 * 60 * 1000);
    },
  });
}
