// Glasovno čitanje pitanja (Web Speech API). Radi samo ako uređaj ima hrvatski ili srodan glas.

let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('hr')) ||
    voices.find((v) => /^(sr|bs|sh)/i.test(v.lang)) ||
    null
  );
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice();
  };
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function hasCroatianVoice(): boolean {
  if (voice === undefined) voice = pickVoice();
  return !!voice;
}

export function speak(text: string) {
  if (!speechSupported()) return;
  if (voice === undefined) voice = pickVoice();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hr-HR';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) speechSynthesis.cancel();
}

let lastAuto = '';
/** Automatsko čitanje: isti tekst čita samo jednom zaredom (npr. ne ponovno pri otkrivanju odgovora). */
export function speakOnce(text: string) {
  if (text === lastAuto) return;
  lastAuto = text;
  speak(text);
}
