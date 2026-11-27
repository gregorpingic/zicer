import { useEffect, useState } from 'react';
import { Button, Modal } from './common';
import { changePin, getPin, pinStatus, savePin } from '../db/pin';
import { syncNow } from '../db/sync';

/** Odjeljak u postavkama: postavljanje, promjena i uklanjanje kućnog PIN-a. */
export function PinSettings() {
  const [set, setSet] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => void pinStatus().then(setSet), []);

  const submit = async (value: string | null) => {
    const err = await changePin(value, getPin());
    if (err) return setMsg({ ok: false, text: err });
    setSet(value !== null);
    setPin('');
    setMsg({ ok: true, text: value ? `PIN je postavljen. Upišite ga jednom na svakom drugom uređaju.` : 'PIN je uklonjen.' });
    void syncNow();
  };

  return (
    <section className="card">
      <h2>Kućni PIN</h2>
      <p className="muted">
        Štiti zajedničku bazu (pitanja, povijest, postavke) od svakoga tko zna adresu aplikacije. Upisuje se jednom po uređaju.
        {set === null ? ' Provjeravam…' : set ? ' PIN je postavljen ✓' : ' PIN još nije postavljen.'}
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(pin);
        }}
      >
        <input className="pin-input" inputMode="numeric" pattern="\d{4,8}" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4–8 znamenki" />
        <Button type="submit" disabled={pin.length < 4}>
          {set ? 'Promijeni PIN' : 'Postavi PIN'}
        </Button>
        {set && (
          <Button variant="ghost" onClick={() => confirm('Ukloniti PIN? Baza će opet biti otvorena.') && void submit(null)}>
            Ukloni PIN
          </Button>
        )}
      </form>
      {msg && <div className={`msg ${msg.ok ? 'msg-good' : 'msg-bad'}`}>{msg.text}</div>}
    </section>
  );
}

/** Prozor koji se pojavi kad poslužitelj zatraži PIN (npr. na novom uređaju). */
export function PinPrompt() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    const on = () => {
      if (getPin()) setWrong(true);
      setOpen(true);
    };
    window.addEventListener('zicer-pin-needed', on);
    return () => window.removeEventListener('zicer-pin-needed', on);
  }, []);
  if (!open) return null;
  return (
    <Modal title="Kućni PIN" onClose={() => setOpen(false)}>
      <p>Zajednička baza zaštićena je PIN-om. Upiši ga jednom i ovaj uređaj će ga zapamtiti.</p>
      {wrong && <div className="msg msg-bad">Spremljeni PIN nije točan.</div>}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          savePin(pin);
          setOpen(false);
          setWrong(false);
          setPin('');
          void syncNow();
        }}
      >
        <input className="pin-input" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" autoFocus />
        <Button type="submit" disabled={pin.length < 4}>
          Spremi
        </Button>
      </form>
    </Modal>
  );
}
