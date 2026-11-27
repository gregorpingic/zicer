// Kućni PIN za zajedničku bazu: sprema se na uređaju i šalje uz svaki zahtjev.
export const API = 'https://zicer.lastegg.app/api';
const KEY = 'zicer-pin';

export const getPin = () => localStorage.getItem(KEY) || '';
export function savePin(pin: string) {
  if (pin) localStorage.setItem(KEY, pin);
  else localStorage.removeItem(KEY);
}
export const pinHeaders = (): Record<string, string> => (getPin() ? { 'x-zicer-pin': getPin() } : {});

/** fetch prema API-ju s PIN-om; na 401 javlja aplikaciji da treba upisati PIN. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', ...pinHeaders(), ...(init.headers || {}) } });
  if (res.status === 401) window.dispatchEvent(new Event('zicer-pin-needed'));
  return res;
}

export async function pinStatus(): Promise<boolean | null> {
  try {
    const r = await fetch(`${API}/pin`);
    return ((await r.json()) as { set: boolean }).set;
  } catch {
    return null;
  }
}

/** Postavlja, mijenja (old = trenutni) ili uklanja (pin = null) PIN. */
export async function changePin(pin: string | null, old: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/pin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin, old }) });
    if (r.ok) {
      savePin(pin ?? '');
      return null;
    }
    const e = ((await r.json().catch(() => ({}))) as { error?: string }).error;
    return e === 'pin' ? 'Trenutni PIN nije točan.' : e === 'pin-locked' ? 'Previše pogrešnih pokušaja – pokušaj za 15 minuta.' : e || `Greška ${r.status}`;
  } catch {
    return 'Nema veze s poslužiteljem.';
  }
}
