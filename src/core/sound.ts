// Suptilni zvučni efekti generirani u pregledniku (bez datoteka – rade i offline).

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  correct() {
    tone(660, 0, 0.18, 'triangle');
    tone(990, 0.1, 0.3, 'triangle');
  },
  wrong() {
    tone(180, 0, 0.35, 'sawtooth', 0.07);
    tone(140, 0.08, 0.35, 'sawtooth', 0.06);
  },
  reveal() {
    tone(880, 0, 0.12, 'sine', 0.08);
  },
  tick() {
    tone(1200, 0, 0.05, 'square', 0.03);
  },
  timeUp() {
    tone(440, 0, 0.2, 'square', 0.06);
    tone(330, 0.2, 0.4, 'square', 0.06);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.4, 'triangle', 0.1));
  },
};
