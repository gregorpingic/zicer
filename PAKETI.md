# Paketi pitanja za Zicer

Pitanja se uvoze kao JSON datoteke u izborniku **Pitanja i paketi → Uvoz paketa pitanja**.
Jedna datoteka = jedan paket. Gotovi valjani primjeri za svaku vrstu igre nalaze se u
[`public/primjeri/`](public/primjeri/) (a u aplikaciji se mogu preuzeti gumbima ispod uvoza).

## Struktura paketa

```json
{
  "format": "zicer-paket",
  "version": 1,
  "pack": {
    "id": "moj-paket-1",
    "name": "Moj prvi paket",
    "author": "Antonija",
    "description": "Neobavezan opis"
  },
  "questions": [ { "id": "moj-quiz-001", "type": "quiz", "...": "..." } ]
}
```

## Pravila za ID

- Svako pitanje mora imati **jedinstveni `id`**: 3–80 znakova, samo slova bez dijakritika, brojke, `.`, `-` i `_`.
- Pitanje čiji ID već postoji u bazi **odbija se kao duplikat** (i javlja se u izvješću o uvozu).
- Prema ID-ju aplikacija pamti koja su pitanja već odigrana i ne ponavlja ih između sesija dok se baza za tu vrstu ne iscrpi.
- Preporuka: prefiks paketa + vrsta + redni broj, npr. `ljeto24-quiz-007`.

## Zajednička polja (sva neobavezna osim gdje piše drugačije)

| Polje | Opis |
|---|---|
| `difficulty` | 1 = lako, 2 = srednje, 3 = teško |
| `category` | Kategorija za statistiku (kod `quiz` obavezna i mora biti jedna od 11 kategorija) |
| `source` | Izvor činjenice – **obavezan** kod činjeničnih vrsta (označeno ✱) |
| `explanation` | Kratko objašnjenje nakon otkrivanja – **obavezno** kod ✱ i kod `oddone` |

## Vrste pitanja

| `type` | Igra | Obavezna polja | Neobavezna polja |
|---|---|---|---|
| `feud` | Što kaže narod? | `question`, `answers` (3–8 × `{text, points}`, od najviše bodova), `estimated` | `accept` uz svaki odgovor, `source` (obavezan ako je `estimated: false`) |
| `closest` ✱ | Najbliži pobjeđuje | `question`, `answer` (broj) | `unit` |
| `list3` | Nabroji tri | `prompt` | `count` (zadano 3), `examples` |
| `knowme` | Koliko me poznaješ? | `question` | – |
| `association` | Asocijacije | `clues` (3–8, od težeg prema lakšem), `answer` | `accept` |
| `truefalse` ✱ | Istina ili laž | `statement`, `answer` (`true`/`false`) | – |
| `quiz` ✱ | Klasični kviz | `question`, `options` (točno 4), `correct` (0–3), `category` | – |
| `order` ✱ | Poredaj po redu | `prompt`, `items` (3–6, **u točnom redoslijedu**) | `values` (isti broj stavki) |
| `oddone` | Izbaci uljeza | `items` (4–5), `odd` (indeks uljeza od 0), `explanation` | `prompt`, `source` |
| `describe` | Pogodi po opisu | `subject`, `clues` (3–8), `answer` | `accept` |
| `higherlower` ✱ | Veće ili manje | `question`, `options` (2), `correct` (0 ili 1) | – |
| `category` | Kategorijski dvoboj | `topic` | `examples` |
| `year` ✱ | Pogodi godinu | `question`, `answer` (cijeli broj) | – |
| `risk` ✱ | Riskiraj bodove | `question`, `options` (4), `correct` (0–3), `category` | – |

Veliko finale nema vlastita pitanja – koristi pitanja ostalih vrsta.

Kategorije za `quiz`: Povijest, Geografija, Filmovi i serije, Glazba, Znanost, Životinje,
Hrana i piće, Hrvatska, Sport, Tehnologija, Zanimljivosti.

**Što kaže narod?** – ako odgovori nisu iz stvarne ankete, postavite `"estimated": true`; aplikacija ih
tada jasno označava kao *procijenjene popularne odgovore*. Polje `accept` sadrži druge oblike i sinonime
koje igrači mogu upisati (aplikacija ionako tolerira padeže i slova bez kvačica).

## Primjeri – po jedan za svaku vrstu

```json
{ "id": "primjer-feud-001", "type": "feud", "difficulty": 1,
  "question": "Što ljudi najčešće rade na godišnjem odmoru kad pada kiša?", "estimated": true,
  "answers": [
    { "text": "Gledaju filmove ili serije", "points": 30, "accept": ["film", "serija", "netflix"] },
    { "text": "Spavaju", "points": 25 },
    { "text": "Idu u trgovački centar", "points": 20, "accept": ["shopping", "kupovina"] },
    { "text": "Igraju društvene igre", "points": 15 },
    { "text": "Sjede u kafiću", "points": 10, "accept": ["kava"] } ] }

{ "id": "primjer-closest-001", "type": "closest", "difficulty": 2, "category": "Zanimljivosti",
  "question": "Koliko je metara visok neboder Burdž Kalifa u Dubaiju?", "answer": 828, "unit": "m",
  "source": "Council on Tall Buildings and Urban Habitat (CTBUH)",
  "explanation": "Burdž Kalifa visok je 828 metara i od otvorenja 2010. najviša je zgrada na svijetu." }

{ "id": "primjer-list3-001", "type": "list3", "prompt": "Nabroji tri stvari koje se uvijek nađu u bakinoj kuhinji.",
  "count": 3, "examples": ["Vegeta", "Domaći kolači", "Staklenke sa zimnicom"] }

{ "id": "primjer-knowme-001", "type": "knowme", "question": "Koja ti je najdraža uspomena s nekog putovanja?" }

{ "id": "primjer-association-001", "type": "association", "clues": ["Kist", "Platno", "Paleta", "Galerija"],
  "answer": "Slika", "accept": ["slikarstvo", "slikar"] }

{ "id": "primjer-truefalse-001", "type": "truefalse", "category": "Zanimljivosti",
  "statement": "Kineski zid vidi se golim okom iz svemira.", "answer": false,
  "source": "NASA – Earth Observatory", "explanation": "Zid je uzak i sličan boji okoliša pa se s orbite golim okom ne razaznaje." }

{ "id": "primjer-quiz-001", "type": "quiz", "category": "Životinje",
  "question": "Koja je najveća životinja koja je ikada živjela na Zemlji?",
  "options": ["Argentinosaurus", "Plavetni kit", "Afrički slon", "Megalodon"], "correct": 1,
  "source": "Smithsonian Ocean – Blue Whale", "explanation": "Plavetni kit može narasti do oko 30 m i težiti više od 150 tona." }

{ "id": "primjer-order-001", "type": "order", "category": "Znanost",
  "prompt": "Poredaj planete prema promjeru – od najvećeg.",
  "items": ["Jupiter", "Saturn", "Uran", "Neptun", "Zemlja"],
  "values": ["≈ 139 800 km", "≈ 116 500 km", "≈ 50 700 km", "≈ 49 200 km", "≈ 12 700 km"],
  "source": "NASA – Planetary Fact Sheet", "explanation": "Uran i Neptun gotovo su jednako veliki." }

{ "id": "primjer-oddone-001", "type": "oddone", "prompt": "Koji od ovih pojmova nije otok?",
  "items": ["Krk", "Cres", "Rab", "Pelješac", "Lošinj"], "odd": 3,
  "explanation": "Pelješac je poluotok, spojen s kopnom kod Stona." }

{ "id": "primjer-describe-001", "type": "describe", "subject": "Država",
  "clues": ["Moj parlament, osnovan 930. godine, jedan je od najstarijih na svijetu.", "Na mojoj zastavi nalazi se križ.",
            "Jedan moj gejzir dao je ime svim gejzirima na svijetu.", "Glavni grad mi je Reykjavík."],
  "answer": "Island" }

{ "id": "primjer-higherlower-001", "type": "higherlower", "category": "Geografija",
  "question": "Leži li Zagreb sjevernije ili južnije od Venecije?", "options": ["Sjevernije", "Južnije"], "correct": 0,
  "source": "Geografske koordinate: Zagreb ≈ 45,81° N, Venecija ≈ 45,44° N", "explanation": "Zagreb je oko 40 km sjevernije." }

{ "id": "primjer-category-001", "type": "category", "topic": "Hrvatski otoci", "examples": ["Krk", "Cres", "Brač", "Hvar"] }

{ "id": "primjer-year-001", "type": "year", "category": "Povijest", "question": "Koje je godine potonuo Titanic?",
  "answer": 1912, "source": "Encyclopaedia Britannica – Titanic", "explanation": "Potonuo je 15. travnja 1912." }

{ "id": "primjer-risk-001", "type": "risk", "category": "Zanimljivosti",
  "question": "Koliko država članica ima Europska unija (stanje 2025.)?", "options": ["25", "26", "27", "28"], "correct": 2,
  "source": "Europska unija – european-union.europa.eu", "explanation": "Nakon izlaska Ujedinjenog Kraljevstva 2020. EU ima 27 članica." }
```

Svaki od ovih objekata ide u polje `"questions"` paketa. Cjelovite datoteke spremne za uvoz:
`public/primjeri/<vrsta>.json` i `public/primjeri/svi-primjeri.json` (svi primjeri u jednom paketu –
ako ga uvezete nakon pojedinačnih, pitanja će biti odbijena kao duplikati, što je očekivano).

Nakon izmjene primjera u `scripts/generiraj-primjere.mjs` pokrenite `node scripts/generiraj-primjere.mjs`,
a `npm test` provjerava da su svi primjeri i ugrađeni paket valjani.
