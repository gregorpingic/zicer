# Zicer – kućni kviz dvoboj

Web-aplikacija (PWA) za dvoje odraslih igrača na jednom uređaju: kombinacija TV kvizova i društvenih igara,
bez voditelja, registracije i interneta.

## Pokretanje

```bash
npm install
npm run dev        # razvoj: http://localhost:5173
npm test           # provjera bodovanja, validacije i svih JSON primjera
npm run build      # produkcijska verzija u dist/ (uključuje service worker)
npm run preview    # posluživanje dist/ – odavde se aplikacija može instalirati
```

Za instalaciju na mobitel/TV aplikaciju treba poslužiti preko HTTPS-a (ili `localhost`) – npr. bilo koji
statički hosting za sadržaj mape `dist/`. Nakon prvog otvaranja radi i bez interneta.

## Igranje na televizoru s mobitelima

1. Na televizoru (preglednik na TV-u ili laptop na HDMI-ju) otvorite Zicer → **📺 Igraj na televizoru s mobitelima**,
   po želji **⛶ Cijeli zaslon**.
2. Svaki igrač skenira QR kod (ili otvori Zicer → **📱 Pridruži se s mobitela** i upiše kod) i odabere svoje ime.
3. Dvoboj se bira na mobitelu. Televizor prikazuje pitanja, ploču i rezultat, a svatko odgovara na svom
   mobitelu – tajni odgovori nikad se ne pojavljuju na televizoru.
4. Izbornik **⋯** na mobitelu: pauza, preskakanje pitanja, ručna korekcija bodova, promjena igrača.

Mobiteli se spajaju izravno s televizorom (WebRTC); za uspostavu veze koristi se besplatni javni poslužitelj
PeerJS, pa je za spajanje potreban internet. Kod sobe ostaje isti, a mobitel se nakon prekida sam ponovno spoji.
Ako se mobitel ne može spojiti, na televizoru se uz svaki potez može kliknuti „odgovori ovdje”.

## Što je napravljeno

- 14 vrsta igara + Veliko finale (dvostruki bodovi, igrač koji zaostaje uvijek je prvi na potezu, zadnje pitanje ×3).
- Načini: Brzi (3 runde), Standardni (6), Veliki (10), Prilagođeni (1–20 rundi, 2/4/6 pitanja po rundi).
- Nasumičan ili ručni odabir vrsta igara, odabir težine.
- Tajni odgovori sa zaslonom za predaju uređaja – rješenje se ne iscrtava dok oba igrača ne odgovore.
- Pravila prije svake runde, stalno vidljiv rezultat, animacija dodjele bodova, ručna korekcija bodova.
- Neriješeno → dodatno pitanje (Najbliži pobjeđuje / Pogodi godinu).
- Pauza (tipka P), preskakanje pitanja, automatsko spremanje i nastavak nedovršene igre.
- Povijest dvoboja, pobjede, osobni rekordi, uspješnost po kategorijama, reset statistike uz potvrdu.
- Pamćenje odigranih pitanja između sesija (po ID-ju) dok se baza za pojedinu vrstu ne iscrpi.
- Uvoz JSON paketa (više datoteka odjednom ili lijepljenjem), odbijanje duplikata, izvoz vlastitih pitanja.
- Obrazac za vlastita pitanja za svaku vrstu igre.
- Zvučni efekti generirani u pregledniku (rade offline), glasovno čitanje na hrvatskom (ako uređaj ima glas).

Ugrađeni paket ima **3 probna pitanja po vrsti** (`src/data/osnovni-paket.json`). Format paketa i primjer
valjanog JSON-a za svaku vrstu: **[PAKETI.md](PAKETI.md)** i [`public/primjeri/`](public/primjeri/).

## Arhitektura

```
src/
  core/types.ts       tipovi pitanja, stanja dvoboja, postavki (sve serijalizabilno)
  core/validate.ts    validacija pitanja i paketa (poruke na hrvatskom)
  core/gameInfo.ts    nazivi, pravila, načini igre
  core/scoring.ts     čiste funkcije bodovanja i tolerantne usporedbe odgovora
  core/engine.ts      prijelazi stanja dvoboja, odabir pitanja bez ponavljanja
  core/stats.ts       statistika iz povijesti
  db/db.ts            IndexedDB: pitanja, paketi, odigrana pitanja, povijest, postavke, spremljena igra
  games/              po jedna komponenta za svaku vrstu igre + registar (games/index.ts)
  screens/            početni zaslon, postavljanje, igra, povijest, pitanja, postavke
```

**Nova vrsta igre:** tip u `types.ts` → validacija u `validate.ts` → opis i pravila u `gameInfo.ts` →
komponenta koja prima `GameProps` i poziva `onDone({ points, outcome })` → zapis u `games/index.ts`.

**Televizor + mobiteli (`src/remote/`):** igra se vodi samo na televizoru. Svaki ulazni dio igre omotan je
komponentom `Control`, koja opisuje što igrač može napraviti (`ControlSpec`: gumbi, izbor, broj, tekst,
ulog, poredak). Na jednom uređaju prikazuje se normalno sučelje, a u načinu s mobitelima opis se šalje
mobitelu tog igrača (`host.ts`), koji ga iscrtava (`PhoneApp.tsx`) i vraća odgovor. Nova vrsta igre koja
koristi `Control` i `SecretSequence` automatski radi i s mobitelima.
