// Veličina prikaza na televizoru. Preglednici na TV-u često prijavljuju mali ekran (npr. 960×540),
// pa se u načinu za televizor sve skalira prema ekranu, a igrači mogu ručno povećati ili smanjiti prikaz.

const KEY = 'zicer-tv-zoom';
const MIN = 0.6;
const MAX = 1.6;

export function getTvZoom(): number {
  const v = Number(localStorage.getItem(KEY));
  return Number.isFinite(v) && v >= MIN && v <= MAX ? v : 1;
}

function apply(z: number) {
  document.documentElement.style.setProperty('--tv-scale', String(z));
}

export function setTvMode(on: boolean) {
  document.documentElement.classList.toggle('tv-mode', on);
  apply(getTvZoom());
}

export function changeTvZoom(delta: number): number {
  const z = Math.round(Math.min(MAX, Math.max(MIN, getTvZoom() + delta)) * 100) / 100;
  localStorage.setItem(KEY, String(z));
  apply(z);
  window.dispatchEvent(new Event('zicer-tv-zoom'));
  return z;
}
