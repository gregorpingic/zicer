# Slaže kurirani paket pitanja: najbolja pitanja iz starih paketa + nova, ručno pisana pitanja.
# Pokretanje: python3 scripts/kurirani-paket.py <mapa sa starim paketima> <izlazna datoteka>
import json, re, sys, glob

SRC_DIR, OUT = sys.argv[1], sys.argv[2]

# ---------------------------------------------------------------------------
# 1) Što zadržavamo iz starih paketa
# ---------------------------------------------------------------------------
old = []
for f in sorted(glob.glob(f'{SRC_DIR}/zicer-veliki-*.json')):
    old += json.load(open(f))['questions']

JUNK = re.compile('|'.join([
    r'tema:', r'\(tema', r'pisanih znakova', r'pisani znak', r'samoglasnik', r'a, e, i, o', r'unatrag', r'abeced', r'djeljiv',
    r'umnož', r'zbroj', r'višekratnik', r'izraz', r'ostatak', r'protona', r'tisućama km', r'površin', r'unesco-ov popis',
    r'pristupila un', r'ujedinjenih naroda', r'kartica', r'žeton', r'uvela euro', r'nobelov', r'oscara na dodjeli', r'dodjel[ai] oscara',
    r'atomsk', r'kemijski simbol elementa', r'oznaku [a-z]{1,2}\?', r'oko kojeg tijela kruži', r'riječ dulja', r'zadnji znak', r'prvi znak',
    r'okrenut', r'izbrišeš', r'prosjek', r'vjerojatnost', r'%', r'€', r'kuna', r'tečaj', r'decilit', r'mililit', r'kilogram', r' kg', r' dag',
    r' cm', r' mm', r'km/h', r'opseg', r'obujam', r'minuta', r'sekund', r'koliko je \d', r'\d+ ?[×x] ?\d', r'koliki je', r'kolika je',
]), re.I)

def txt(q):
    return json.dumps({k: v for k, v in q.items() if k not in ('source', 'explanation', 'packId', 'id')}, ensure_ascii=False)

def keep_old(q):
    t = q['type']
    s = txt(q)
    if t in ('association', 'knowme'):
        return not JUNK.search(s)
    if t == 'feud':
        return len(q['question']) <= 75 and not JUNK.search(s)
    if t == 'list3':
        return len(q['prompt']) <= 55 and not re.search(r'možeš|bez |prije |kad |koje se mogu', q['prompt'])
    if t == 'category':
        return len(q['topic']) <= 32 and not re.search(r'mogu|možeš|koje se|kojima|na kojima|kad ', q['topic'], re.I)
    if t == 'oddone':
        return not JUNK.search(s) and not re.search(r'\d', s)
    if t in ('quiz', 'risk', 'truefalse', 'higherlower', 'year', 'order'):
        # stara činjenična pitanja: samo provjerene teme (bez računanja i strojnih serija)
        if JUNK.search(s) or re.search(r'zadnjega znaka|ukupan broj|skladišn|rezervacij|sredina|referentnoj|SI |prefiks|unutar istog|dulje: jedna|količina kave|pakiranja više', s):
            return False
        return bool(WHITE.search(s))
    return False  # closest i describe: sve staro izbacujemo

WHITE = re.compile(r'pixar|toy story|nemo|nebesa|wall|ratatouille|apoll|sputnik|voyager|hubble|berlinski zid|world wide web|'
                   r'mars|jupiter|saturn|neptun|uran|merkur|venera|šah|rokad|pješak|figur|unesco-ovog|dioklecijan|eufrazij|'
                   r'šibenik|starogradsko|trogir|hobotnic|glavni grad|u kojoj se državi nalazi|olimpijske igre|nogometno sp|'
                   r'oscara za najbolji film na dodjeli u (199|20)|dupin|shrek', re.I)
LIMITS = [(r'izašao pixarov', 6), (r'glavni grad', 15), (r'u kojoj se državi nalazi', 10), (r'olimpijske igre', 8), (r'nogometno sp|nogometnog sp', 6), (r'oscara', 6)]
limit_count = {p: 0 for p, _ in LIMITS}
kept, seen = [], set()
wc = 0
for q in old:
    if not keep_old(q):
        continue
    over = False
    for pat, n in LIMITS:
        if re.search(pat, txt(q), re.I):
            limit_count[pat] += 1
            over = limit_count[pat] > n
            break
    if over:
        continue
    key = (q['type'], re.sub(r'\W+', '', (q.get('question') or q.get('prompt') or q.get('statement') or q.get('topic') or q.get('answer') or ' '.join(q.get('items', []))).lower()))
    if key in seen:
        continue
    seen.add(key)
    q = {k: v for k, v in q.items() if k != 'packId'}
    kept.append(q)

# ---------------------------------------------------------------------------
# 2) Nova pitanja
# ---------------------------------------------------------------------------
new = []
def add(type_, items):
    for i, it in enumerate(items, 1):
        q = {'id': f'kur-{type_}-{i:03d}', 'type': type_}
        q.update(it)
        new.append(q)

# --- Najbliži pobjeđuje: zabavne procjene, bez računanja ---
def C(question, answer, unit, source, explanation, cat='Zanimljivosti', d=2):
    return dict(question=question, answer=answer, unit=unit, source=source, explanation=explanation, category=cat, difficulty=d)
add('closest', [
    C('Koliko je visok Eiffelov toranj (s antenama)?', 330, 'm', 'Société d’exploitation de la tour Eiffel', 'Od 2022. s novom antenom visok je 330 m; bez antena oko 300 m.', 'Geografija'),
    C('Koliko je dugačak Pelješki most?', 2404, 'm', 'Hrvatske ceste', 'Pelješki most dug je 2404 m i otvoren je 2022. godine.', 'Hrvatska'),
    C('Koliko stanovnika ima Zagreb (popis 2021.)?', 767131, 'stanovnika', 'DZS – Popis stanovništva 2021.', 'Prema popisu 2021. Grad Zagreb ima 767 131 stanovnika.', 'Hrvatska'),
    C('Koliko stanovnika ima Hrvatska (popis 2021.)?', 3871833, 'stanovnika', 'DZS – Popis stanovništva 2021.', 'Popis 2021. izbrojio je 3 871 833 stanovnika.', 'Hrvatska'),
    C('Koliko je metara visok vrh Sljemena na Medvednici?', 1033, 'm', 'Hrvatska enciklopedija – Medvednica', 'Sljeme je visoko 1033 m.', 'Hrvatska', 1),
    C('Koliko tipki ima standardni klavir?', 88, 'tipki', 'Encyclopaedia Britannica – Piano', '52 bijele i 36 crnih tipki.', 'Glazba'),
    C('Koliko država članica ima Organizacija ujedinjenih naroda?', 193, 'države', 'UN – Member States', 'Posljednja je primljena Južni Sudan 2011.', 'Zanimljivosti'),
    C('Koliko je dubok najdublji dio oceana (Challenger Deep u Marijanskoj brazdi)?', 10935, 'm', 'NOAA', 'Mjerenja se razlikuju, ali iznosi oko 10 900 – 11 000 m.', 'Geografija', 3),
    C('Kolika je brzina zvuka u zraku (pri 20 °C)?', 1235, 'km/h', 'NASA – Speed of Sound', 'Oko 343 m/s, odnosno 1235 km/h.', 'Znanost', 3),
    C('Koliko je kilometara dug maraton?', 42.195, 'km', 'World Athletics', 'Maraton je dug točno 42,195 km.', 'Sport', 1),
    C('Koliko litara krvi ima prosječna odrasla osoba?', 5, 'L', 'Encyclopaedia Britannica – Blood', 'Odrasla osoba ima oko 5 litara krvi.', 'Znanost', 1),
    C('Koliko je visok Kip slobode, od tla do vrha baklje?', 93, 'm', 'National Park Service – Statue of Liberty', 'S postoljem je visok oko 93 m; sam kip oko 46 m.', 'Geografija'),
    C('Koliko je kilometara prosječno udaljen Mjesec od Zemlje?', 384400, 'km', 'NASA – Moon Fact Sheet', 'Prosječna udaljenost je oko 384 400 km.', 'Znanost', 3),
    C('Kolika je temperatura na površini Sunca?', 5500, '°C', 'NASA – Sun Fact Sheet', 'Površina (fotosfera) ima oko 5500 °C.', 'Znanost', 3),
    C('Koliko zuba ima odrasla osoba (s umnjacima)?', 32, 'zuba', 'Hrvatska enciklopedija – zubi', 'Trajno zubalo ima 32 zuba.', 'Znanost', 1),
    C('Koliko kalorija ima banana srednje veličine?', 105, 'kcal', 'USDA FoodData Central', 'Srednja banana (oko 118 g) ima oko 105 kcal.', 'Hrana i piće'),
    C('Koliko je kilograma imala najteža bundeva ikad izvagana (rekord iz 2023.)?', 1247, 'kg', 'Guinness World Records', 'Rekordna bundeva iz 2023. imala je 1247 kg.', 'Zanimljivosti', 3),
    C('Koliko minuta treba svjetlosti da sa Sunca stigne do Zemlje?', 8.3, 'min', 'NASA', 'Oko 8 minuta i 20 sekundi.', 'Znanost'),
    C('Koliko je visok toranj s Big Benom u Londonu?', 96, 'm', 'UK Parliament – Elizabeth Tower', 'Elizabeth Tower visok je 96 m.', 'Geografija'),
    C('S koliko država Hrvatska graniči kopnom?', 5, 'država', 'Hrvatska enciklopedija – Hrvatska', 'Slovenija, Mađarska, Srbija, Bosna i Hercegovina i Crna Gora.', 'Hrvatska', 1),
    C('Koliko slova ima hrvatska abeceda?', 30, 'slova', 'Hrvatski pravopis', 'Hrvatska abeceda ima 30 slova, uključujući dž, lj i nj.', 'Hrvatska', 1),
    C('Koliko većih jezera ima na Plitvicama?', 16, 'jezera', 'NP Plitvička jezera', '16 većih jezera povezano je slapovima i kaskadama.', 'Hrvatska'),
    C('Koliko je metara visok Veliki slap na Plitvicama?', 78, 'm', 'NP Plitvička jezera', 'Veliki slap najviši je slap u Hrvatskoj s 78 m.', 'Hrvatska'),
    C('Koliko je minuta trajao najdulji teniski meč u povijesti (Isner – Mahut, Wimbledon 2010.)?', 665, 'min', 'Wimbledon', 'Meč je trajao 11 sati i 5 minuta kroz tri dana.', 'Sport', 3),
    C('Koliko dana traje jedna godina na Marsu?', 687, 'dana', 'NASA – Mars Fact Sheet', 'Mars obiđe Sunce za oko 687 zemaljskih dana.', 'Znanost', 3),
    C('Koliko četvornih kilometara ima kopnena površina Hrvatske?', 56594, 'km²', 'DZS – Statistički ljetopis', 'Kopnena površina Hrvatske je 56 594 km².', 'Hrvatska', 3),
    C('Kolikom brzinom može trčati gepard?', 110, 'km/h', 'Smithsonian’s National Zoo', 'U kratkom sprintu gepard postiže oko 100–120 km/h.', 'Životinje'),
    C('Koliko je centimetara bio visok najviši čovjek u povijesti, Robert Wadlow?', 272, 'cm', 'Guinness World Records', 'Robert Wadlow bio je visok 272 cm.', 'Zanimljivosti'),
    C('Kolika je najniža temperatura ikad izmjerena na Zemlji (Antarktika, 1983.)?', -89.2, '°C', 'Svjetska meteorološka organizacija (WMO)', 'Na postaji Vostok izmjereno je −89,2 °C.', 'Znanost', 3),
    C('Kolika je najviša temperatura zraka ikad izmjerena na Zemlji (Dolina smrti, 1913.)?', 56.7, '°C', 'Svjetska meteorološka organizacija (WMO)', 'U Dolini smrti u SAD-u izmjereno je 56,7 °C.', 'Znanost', 3),
    C('Koliko je zlatnih olimpijskih medalja osvojio Michael Phelps?', 23, 'zlata', 'Međunarodni olimpijski odbor', 'Phelps ima 23 zlatne i ukupno 28 olimpijskih medalja.', 'Sport'),
    C('Koliko zvjezdica ima na zastavi Europske unije?', 12, 'zvjezdica', 'Europska unija – simboli', 'Dvanaest zvjezdica simbolizira jedinstvo, a ne broj članica.', 'Zanimljivosti', 1),
    C('Koliko minuta traje film „Titanic” (1997.)?', 194, 'min', 'AFI Catalog', 'Titanic traje 3 sata i 14 minuta.', 'Filmovi i serije'),
    C('Koliko epizoda ima serija „Prijatelji” (Friends)?', 236, 'epizoda', 'Warner Bros. Television', 'Deset sezona, ukupno 236 epizoda.', 'Filmovi i serije'),
    C('Koliko je dugačak Krčki most?', 1430, 'm', 'Hrvatska enciklopedija – Krčki most', 'Most kopno – Sveti Marko – Krk dug je 1430 m.', 'Hrvatska', 3),
    C('Koliko kostiju ima ljudska šaka sa zapešćem?', 27, 'kostiju', 'Encyclopaedia Britannica – Hand', '8 kostiju zapešća, 5 kostiju pešća i 14 članaka prstiju.', 'Znanost', 3),
    C('Koliko stepenica vodi do vrha Eiffelova tornja?', 1665, 'stepenica', 'Société d’exploitation de la tour Eiffel', 'Do vrha vodi 1665 stepenica, ali posjetitelji pješice idu samo do 2. kata.', 'Zanimljivosti', 3),
    C('Koliko je dug Dunav?', 2850, 'km', 'Encyclopaedia Britannica – Danube', 'Dunav je dug oko 2850 km i druga je najdulja rijeka Europe.', 'Geografija', 3),
    C('Koliko je godina živjela najstarija osoba u povijesti, Jeanne Calment?', 122, 'godine', 'Guinness World Records', 'Francuskinja Jeanne Calment doživjela je 122 godine i 164 dana.', 'Zanimljivosti'),
    C('Koliko je visok Mount Blanc, najviši vrh Alpa?', 4806, 'm', 'Encyclopaedia Britannica – Mont Blanc', 'Visina mu je oko 4806 m i blago se mijenja zbog leda.', 'Geografija', 3),
    C('Koliko je metara visok Triglav?', 2864, 'm', 'Hrvatska enciklopedija – Triglav', 'Triglav je najviši vrh Slovenije.', 'Geografija'),
    C('Koliko je otoka, otočića i hridi u Nacionalnom parku Kornati?', 89, '', 'NP Kornati', 'Park obuhvaća 89 otoka, otočića i hridi.', 'Hrvatska', 3),
    C('Koliko je knjiga u serijalu o Harryju Potteru?', 7, 'knjiga', 'Bloomsbury', 'Sedam knjiga, od „Kamena mudraca” do „Darova smrti”.', 'Filmovi i serije', 1),
    C('Koliko tjedana traje trudnoća kod ljudi (računa se od zadnje menstruacije)?', 40, 'tjedana', 'Svjetska zdravstvena organizacija', 'Termin poroda je oko 40. tjedna.', 'Znanost', 1),
    C('Koliko je godina stara Dioklecijanova palača u Splitu (izgrađena oko 305. godine)?', 1720, 'godina', 'Hrvatska enciklopedija – Dioklecijanova palača', 'Palača je dovršena oko 305. godine – stara je oko 1700 godina.', 'Hrvatska', 3),
])

# --- Pogodi godinu ---
def Y(question, answer, source, explanation, cat, d=2):
    return dict(question=question, answer=answer, source=source, explanation=explanation, category=cat, difficulty=d)
add('year', [
    Y('Koje je godine Kristofor Kolumbo stigao u Ameriku?', 1492, 'Encyclopaedia Britannica', 'Kolumbo je stigao na Bahame 12. listopada 1492.', 'Povijest', 1),
    Y('Koje je godine izbila Francuska revolucija?', 1789, 'Encyclopaedia Britannica', 'Pad Bastilje dogodio se 14. srpnja 1789.', 'Povijest'),
    Y('Koje su godine braća Wright izveli prvi let motornim zrakoplovom?', 1903, 'Smithsonian National Air and Space Museum', 'Prvi let bio je 17. prosinca 1903.', 'Povijest'),
    Y('Koje je godine počeo Prvi svjetski rat?', 1914, 'Encyclopaedia Britannica', 'Rat je počeo u srpnju 1914.', 'Povijest', 1),
    Y('Koje je godine završio Drugi svjetski rat?', 1945, 'Encyclopaedia Britannica', 'Rat je završio u svibnju (Europa) i rujnu (Japan) 1945.', 'Povijest', 1),
    Y('Koje je godine Hrvatski sabor proglasio samostalnost Hrvatske?', 1991, 'Hrvatski sabor', 'Odluka o samostalnosti donesena je 25. lipnja 1991.', 'Hrvatska', 1),
    Y('Koje je godine euro postao službena valuta u Hrvatskoj?', 2023, 'Hrvatska narodna banka', 'Euro je uveden 1. siječnja 2023.', 'Hrvatska', 1),
    Y('Koje je godine Hrvatska igrala finale nogometnog Svjetskog prvenstva u Rusiji?', 2018, 'FIFA', 'U finalu je Francuska pobijedila 4:2.', 'Sport', 1),
    Y('Koje je godine Hrvatska osvojila broncu na Svjetskom prvenstvu u Francuskoj?', 1998, 'FIFA', 'Na prvom nastupu Hrvatska je osvojila treće mjesto.', 'Sport'),
    Y('Koje je godine u kina stigao prvi film o Harryju Potteru?', 2001, 'Warner Bros.', '„Harry Potter i Kamen mudraca” premijerno je prikazan 2001.', 'Filmovi i serije'),
    Y('Koje je godine pokrenut Facebook?', 2004, 'Meta – Company Info', 'Facebook je pokrenut u veljači 2004.', 'Tehnologija'),
    Y('Koje je godine Jurij Gagarin postao prvi čovjek u svemiru?', 1961, 'ESA', 'Gagarin je poletio 12. travnja 1961.', 'Znanost'),
    Y('Koje se godine dogodila nesreća u Černobilu?', 1986, 'IAEA', 'Nesreća se dogodila 26. travnja 1986.', 'Povijest'),
    Y('Koje je godine izašao album „Thriller” Michaela Jacksona?', 1982, 'Epic Records', 'Thriller je najprodavaniji album svih vremena.', 'Glazba'),
    Y('Koje je godine Napoleon poražen kod Waterlooa?', 1815, 'Encyclopaedia Britannica', 'Bitka kod Waterlooa bila je 18. lipnja 1815.', 'Povijest'),
    Y('Koje je godine pao Carigrad (Konstantinopol)?', 1453, 'Encyclopaedia Britannica', 'Osmanlije su osvojile grad 29. svibnja 1453.', 'Povijest', 3),
    Y('Koje je godine, prema predaji, okrunjen kralj Tomislav?', 925, 'Hrvatska enciklopedija – Tomislav', 'Tomislav se 925. spominje kao kralj Hrvata.', 'Hrvatska', 3),
    Y('Koje je godine osnovan Google?', 1998, 'Google – About', 'Larry Page i Sergey Brin osnovali su Google u rujnu 1998.', 'Tehnologija'),
    Y('Koje je godine izašao prvi film „Ratovi zvijezda”?', 1977, 'Lucasfilm', 'Prvi film izašao je u svibnju 1977.', 'Filmovi i serije'),
    Y('Koje je godine provedena vojno-redarstvena operacija Oluja?', 1995, 'Hrvatska enciklopedija – Oluja', 'Oluja je provedena od 4. do 7. kolovoza 1995.', 'Hrvatska', 1),
    Y('Koje je godine održan prvi Eurosong?', 1956, 'Eurovision.tv', 'Prvi Eurosong održan je 1956. u Luganu.', 'Glazba', 3),
    Y('Koje je godine ABBA pobijedila na Eurosongu s pjesmom „Waterloo”?', 1974, 'Eurovision.tv', 'ABBA je pobijedila u Brightonu 1974.', 'Glazba'),
    Y('Koje je godine otvoren Pelješki most?', 2022, 'Hrvatske ceste', 'Most je svečano otvoren 26. srpnja 2022.', 'Hrvatska', 1),
    Y('Koje je godine izumljena Rubikova kocka?', 1974, 'Rubik’s – History', 'Ernő Rubik izumio ju je 1974.', 'Zanimljivosti'),
    Y('Koje je godine izgrađen Berlinski zid?', 1961, 'Encyclopaedia Britannica', 'Zid je počeo nicati 13. kolovoza 1961.', 'Povijest'),
    Y('Koje su godine održane prve moderne Olimpijske igre?', 1896, 'Međunarodni olimpijski odbor', 'Prve moderne igre održane su 1896. u Ateni.', 'Sport'),
    Y('Koje je godine Hrvatska postala članica NATO-a?', 2009, 'NATO', 'Hrvatska je primljena 1. travnja 2009.', 'Hrvatska'),
    Y('Koje je godine Zagreb pogodio jak potres magnitude 5,5?', 2020, 'Seizmološka služba RH', 'Potres se dogodio 22. ožujka 2020.', 'Hrvatska', 1),
    Y('Koje je godine Martin Luther objavio svojih 95 teza?', 1517, 'Encyclopaedia Britannica', 'Teze su objavljene 31. listopada 1517.', 'Povijest', 3),
    Y('Koje je godine rođen William Shakespeare?', 1564, 'Encyclopaedia Britannica', 'Shakespeare je kršten 26. travnja 1564.', 'Povijest', 3),
    Y('Koje je godine izašla prva igra „Super Mario Bros.”?', 1985, 'Nintendo', 'Igra je izašla 1985. za konzolu NES.', 'Tehnologija'),
    Y('Koje je godine Goran Ivanišević osvojio Wimbledon?', 2001, 'Wimbledon', 'Ivanišević je pobijedio s pozivnicom (wild card) 2001.', 'Sport', 1),
    Y('Koje je godine Janica Kostelić osvojila tri zlatne medalje na jednim Olimpijskim igrama?', 2002, 'Međunarodni olimpijski odbor', 'Na ZOI u Salt Lake Cityju 2002. osvojila je tri zlata i srebro.', 'Sport'),
    Y('Koje je godine hrvatska rukometna reprezentacija prvi put postala olimpijski prvak?', 1996, 'Međunarodni olimpijski odbor', 'Zlato je osvojeno na OI u Atlanti 1996.', 'Sport'),
    Y('Koje je godine na YouTube postavljen prvi videozapis?', 2005, 'YouTube', 'Prvi video „Me at the zoo” objavljen je u travnju 2005.', 'Tehnologija'),
    Y('Koje je godine Leonardo da Vinci umro?', 1519, 'Encyclopaedia Britannica', 'Leonardo je umro 2. svibnja 1519. u Francuskoj.', 'Povijest', 3),
    Y('Koje je godine održan prvi Tour de France?', 1903, 'Tour de France', 'Prva utrka održana je 1903.', 'Sport', 3),
    Y('Koje su godine euro novčanice i kovanice ušle u optjecaj?', 2002, 'Europska središnja banka', 'Gotovina eura uvedena je 1. siječnja 2002.', 'Zanimljivosti'),
])

# --- Klasični kviz ---
def Q(question, options, correct, cat, source, explanation, d=2):
    return dict(question=question, options=options, correct=correct, category=cat, source=source, explanation=explanation, difficulty=d)
add('quiz', [
    Q('Tko je bio prvi predsjednik SAD-a?', ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'], 1, 'Povijest', 'Encyclopaedia Britannica', 'Washington je bio predsjednik od 1789. do 1797.', 1),
    Q('Koja je civilizacija izgradila Machu Picchu?', ['Maje', 'Asteci', 'Inke', 'Olmeci'], 2, 'Povijest', 'UNESCO – Machu Picchu', 'Inke su ga izgradile u 15. stoljeću.'),
    Q('Grob kojeg je faraona otkriven 1922. gotovo netaknut?', ['Ramzesa II.', 'Keopsa', 'Tutankamona', 'Kleopatre'], 2, 'Povijest', 'Encyclopaedia Britannica', 'Howard Carter otkrio je Tutankamonov grob u Dolini kraljeva.'),
    Q('Tko je patentirao telefon 1876.?', ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Guglielmo Marconi'], 1, 'Povijest', 'Encyclopaedia Britannica', 'Bell je patent dobio u ožujku 1876.'),
    Q('Koja je francuska kraljica pogubljena 1793.?', ['Marija Antoaneta', 'Katarina Medici', 'Eleonora Akvitanska', 'Marija Terezija'], 0, 'Povijest', 'Encyclopaedia Britannica', 'Marija Antoaneta giljotinirana je u listopadu 1793.'),
    Q('Koja je najveća vruća pustinja na svijetu?', ['Gobi', 'Kalahari', 'Sahara', 'Atacama'], 2, 'Geografija', 'National Geographic', 'Sahara pokriva oko 9 milijuna km² sjeverne Afrike.', 1),
    Q('Koji je najveći ocean?', ['Atlantski', 'Indijski', 'Tihi', 'Arktički'], 2, 'Geografija', 'NOAA', 'Tihi ocean pokriva gotovo trećinu Zemljine površine.', 1),
    Q('Koji je glavni grad Australije?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2, 'Geografija', 'Australian Government', 'Canberra je izgrađena kao kompromis između Sydneyja i Melbournea.'),
    Q('Koji je glavni grad Kanade?', ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'], 1, 'Geografija', 'Government of Canada', 'Ottawa je glavni grad od 1857.'),
    Q('Koje je najdublje jezero na svijetu?', ['Bajkal', 'Tanganjika', 'Gornje jezero', 'Kaspijsko jezero'], 0, 'Geografija', 'UNESCO – Lake Baikal', 'Bajkal je dubok oko 1640 m.', 3),
    Q('Koja država ima najviše stanovnika?', ['Kina', 'Indija', 'SAD', 'Indonezija'], 1, 'Geografija', 'UN – World Population Prospects', 'Indija je 2023. prestigla Kinu.'),
    Q('Tko glumi Jacka u filmu „Titanic”?', ['Brad Pitt', 'Leonardo DiCaprio', 'Matt Damon', 'Johnny Depp'], 1, 'Filmovi i serije', 'AFI Catalog', 'Uz Kate Winslet glumio je Leonardo DiCaprio.', 1),
    Q('U kojoj seriji likovi rade u papirnoj tvrtki Dunder Mifflin?', ['Prijatelji', 'Ured (The Office)', 'Parks and Recreation', 'Seinfeld'], 1, 'Filmovi i serije', 'NBC', 'Radnja američkog „Ureda” smještena je u Scranton.'),
    Q('Tko je režirao „Pakleni šund” (Pulp Fiction)?', ['Martin Scorsese', 'Quentin Tarantino', 'Steven Spielberg', 'David Fincher'], 1, 'Filmovi i serije', 'AFI Catalog', 'Film je osvojio Zlatnu palmu u Cannesu 1994.'),
    Q('Kako se zove kafić u seriji „Prijatelji”?', ['Central Perk', 'Monk’s Café', 'Luke’s Diner', 'MacLaren’s'], 0, 'Filmovi i serije', 'Warner Bros. Television', 'Central Perk je glavno okupljalište šestero prijatelja.'),
    Q('Koji crtani lik živi u ananasu na dnu mora?', ['Patrik', 'Spužva Bob', 'Lignjoslav', 'Nemo'], 1, 'Filmovi i serije', 'Nickelodeon', 'Spužva Bob Skockani živi u ananasu u Bikini Dolu.', 1),
    Q('U kojem filmu Arnold Schwarzenegger izgovara „I’ll be back”?', ['Predator', 'Terminator', 'Komando', 'Total Recall'], 1, 'Filmovi i serije', 'AFI', 'Rečenica iz „Terminatora” (1984.) jedna je od najpoznatijih u povijesti filma.'),
    Q('Koji je bend snimio „Bohemian Rhapsody”?', ['The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd'], 1, 'Glazba', 'Queen Online', 'Pjesmu je napisao Freddie Mercury 1975.', 1),
    Q('Tko pjeva „Cesaricu”?', ['Oliver Dragojević', 'Gibonni', 'Mišo Kovač', 'Tedi Spalato'], 0, 'Glazba', 'Croatia Records', '„Cesarica” je jedna od najpoznatijih Oliverovih pjesama.', 1),
    Q('Iz koje je države grupa ABBA?', ['Norveška', 'Danska', 'Švedska', 'Finska'], 2, 'Glazba', 'Eurovision.tv', 'ABBA je švedska grupa iz Stockholma.', 1),
    Q('Koliko žica ima standardna gitara?', ['4', '5', '6', '7'], 2, 'Glazba', 'Encyclopaedia Britannica – Guitar', 'Standardna akustična i električna gitara imaju šest žica.', 1),
    Q('Koji je skladatelj nastavio skladati i nakon što je gotovo potpuno ogluhnuo?', ['Mozart', 'Beethoven', 'Bach', 'Vivaldi'], 1, 'Glazba', 'Encyclopaedia Britannica', 'Devetu simfoniju Beethoven je skladao gotovo gluh.'),
    Q('Koji je najlakši kemijski element?', ['Helij', 'Vodik', 'Litij', 'Kisik'], 1, 'Znanost', 'IUPAC', 'Vodik je prvi element periodnog sustava.', 1),
    Q('Koji organ proizvodi inzulin?', ['Jetra', 'Bubreg', 'Gušterača', 'Slezena'], 2, 'Znanost', 'Encyclopaedia Britannica', 'Inzulin luče beta-stanice gušterače.'),
    Q('Koja je najtvrđa prirodna tvar?', ['Kvarc', 'Dijamant', 'Granit', 'Željezo'], 1, 'Znanost', 'Encyclopaedia Britannica', 'Dijamant ima tvrdoću 10 na Mohsovoj ljestvici.', 1),
    Q('Kolika je približna brzina svjetlosti?', ['300 km/s', '3000 km/s', '300 000 km/s', '3 000 000 km/s'], 2, 'Znanost', 'NIST', 'Točno 299 792,458 km/s.'),
    Q('Koja je krvna grupa univerzalni davatelj crvenih krvnih stanica?', ['AB pozitivna', '0 negativna', 'A pozitivna', 'B negativna'], 1, 'Znanost', 'Hrvatski zavod za transfuzijsku medicinu', 'Krv 0− može primiti gotovo svatko.', 3),
    Q('Koja je najbrža kopnena životinja?', ['Lav', 'Gepard', 'Antilopa', 'Konj'], 1, 'Životinje', 'Smithsonian’s National Zoo', 'Gepard u sprintu postiže preko 100 km/h.', 1),
    Q('Koliko nogu ima kukac?', ['4', '6', '8', '10'], 1, 'Životinje', 'Encyclopaedia Britannica', 'Svi kukci imaju tri para nogu.', 1),
    Q('Koja životinja spava visi naglavačke?', ['Sova', 'Šišmiš', 'Lenjivac', 'Koala'], 1, 'Životinje', 'Encyclopaedia Britannica', 'Šišmiši se tako lako odbace u let.', 1),
    Q('Koji je najveći kopneni sisavac?', ['Nosorog', 'Žirafa', 'Afrički slon', 'Vodenkonj'], 2, 'Životinje', 'WWF', 'Mužjaci afričkog slona mogu težiti i preko 6 tona.', 1),
    Q('Koja životinja ima tri srca i plavu krv?', ['Hobotnica', 'Meduza', 'Rak', 'Puž'], 0, 'Životinje', 'Smithsonian Ocean', 'Plavu boju krvi daje bakreni hemocijanin.'),
    Q('Iz koje države potječe pizza Margherita?', ['Španjolska', 'Grčka', 'Italija', 'Francuska'], 2, 'Hrana i piće', 'Associazione Verace Pizza Napoletana', 'Prema predaji nastala je u Napulju 1889.', 1),
    Q('Što je glavni sastojak humusa?', ['Leća', 'Slanutak', 'Grah', 'Grašak'], 1, 'Hrana i piće', 'Encyclopaedia Britannica', 'Humus se radi od slanutka, tahinija, limuna i češnjaka.'),
    Q('Od kojeg se mlijeka radi paški sir?', ['Kravljeg', 'Kozjeg', 'Ovčjeg', 'Bivoljeg'], 2, 'Hrana i piće', 'Paški sir – zaštićena oznaka izvornosti', 'Radi se od mlijeka paške ovce.'),
    Q('Što je glavni sastojak guacamolea?', ['Avokado', 'Rajčica', 'Paprika', 'Grah'], 0, 'Hrana i piće', 'Encyclopaedia Britannica', 'Guacamole je meksički umak od zgnječenog avokada.', 1),
    Q('Od koje se voćke radi liker maraskino?', ['Šljive', 'Višnje maraske', 'Smokve', 'Kruške'], 1, 'Hrana i piće', 'Hrvatska enciklopedija – maraskino', 'Maraskino je liker iz Zadra od višnje maraske.'),
    Q('Koliko rijeka teče kroz Karlovac?', ['Dvije', 'Tri', 'Četiri', 'Pet'], 2, 'Hrvatska', 'Grad Karlovac', 'Kupa, Korana, Mrežnica i Dobra – Karlovac je „grad na četiri rijeke”.'),
    Q('U kojem se gradu održava Alka?', ['Sinju', 'Kninu', 'Trilju', 'Imotskom'], 0, 'Hrvatska', 'UNESCO – Sinjska alka', 'Sinjska alka održava se od 1717. i na UNESCO-ovu je popisu.', 1),
    Q('Na kojoj rijeci leži Osijek?', ['Savi', 'Dravi', 'Dunavu', 'Kupi'], 1, 'Hrvatska', 'Grad Osijek', 'Osijek leži na desnoj obali Drave.', 1),
    Q('Tko je napisao „Juditu”?', ['Ivan Gundulić', 'Marko Marulić', 'Marin Držić', 'Petar Hektorović'], 1, 'Hrvatska', 'Hrvatska enciklopedija – Marulić', '„Judita” (1501.) smatra se prvim umjetničkim epom na hrvatskom jeziku.'),
    Q('Koji je najstariji nacionalni park u Hrvatskoj?', ['Krka', 'Plitvička jezera', 'Paklenica', 'Risnjak'], 1, 'Hrvatska', 'NP Plitvička jezera', 'Plitvička jezera proglašena su nacionalnim parkom 1949.'),
    Q('Koliko županija ima Hrvatska?', ['15 i Grad Zagreb', '20 i Grad Zagreb', '21 i Grad Zagreb', '25'], 1, 'Hrvatska', 'Zakon o područjima županija, gradova i općina', '20 županija i Grad Zagreb koji ima status županije.'),
    Q('Tko je 2018. osvojio Zlatnu loptu?', ['Cristiano Ronaldo', 'Lionel Messi', 'Luka Modrić', 'Kylian Mbappé'], 2, 'Sport', 'France Football', 'Modrić je prekinuo desetogodišnju dominaciju Messija i Ronalda.', 1),
    Q('U kojoj je disciplini Blanka Vlašić osvajala medalje?', ['Skok u dalj', 'Skok u vis', 'Bacanje kugle', 'Trčanje na 400 m'], 1, 'Sport', 'World Athletics', 'Blanka Vlašić dvostruka je svjetska prvakinja u skoku u vis.', 1),
    Q('Koji se teniski Grand Slam igra na travi?', ['Roland Garros', 'US Open', 'Wimbledon', 'Australian Open'], 2, 'Sport', 'Wimbledon', 'Wimbledon je jedini Grand Slam na travi.', 1),
    Q('Koliko traje jedno poluvrijeme u rukometu (seniori)?', ['20 minuta', '25 minuta', '30 minuta', '45 minuta'], 2, 'Sport', 'IHF – Pravila igre', 'Utakmica traje dva poluvremena po 30 minuta.'),
    Q('Tko je uz Paula Allena osnovao Microsoft?', ['Steve Jobs', 'Bill Gates', 'Larry Page', 'Mark Zuckerberg'], 1, 'Tehnologija', 'Microsoft', 'Microsoft je osnovan 1975.', 1),
    Q('Koja tvrtka proizvodi PlayStation?', ['Nintendo', 'Microsoft', 'Sony', 'Sega'], 2, 'Tehnologija', 'Sony Interactive Entertainment', 'Prvi PlayStation izašao je 1994.', 1),
    Q('Kako se zove hrvatska tvrtka poznata po električnim hiperautomobilima?', ['Rimac', 'Infobip', 'Span', 'Nanobit'], 0, 'Tehnologija', 'Rimac Automobili', 'Rimac Nevera jedan je od najbržih električnih automobila.', 1),
    Q('Za što je kratica „www”?', ['World Wide Web', 'Wide World Wireless', 'Web World Wide', 'World Web Work'], 0, 'Tehnologija', 'CERN', 'Web je izumio Tim Berners-Lee u CERN-u.', 1),
    Q('Koliko karata ima standardni špil bez džokera?', ['48', '52', '54', '56'], 1, 'Zanimljivosti', 'Encyclopaedia Britannica – Playing cards', 'Četiri boje po 13 karata.', 1),
    Q('Što se slavi 18. listopada u Hrvatskoj i svijetu?', ['Dan kravate', 'Dan kruha', 'Dan Zemlje', 'Dan čokolade'], 0, 'Zanimljivosti', 'Academia Cravatica', 'Kravata potječe od marame hrvatskih vojnika iz 17. stoljeća.'),
    Q('Koliko boja ima duga u tradicionalnoj podjeli?', ['5', '6', '7', '8'], 2, 'Zanimljivosti', 'Encyclopaedia Britannica – Rainbow', 'Crvena, narančasta, žuta, zelena, plava, modra i ljubičasta.', 1),
])

# --- Istina ili laž ---
def T(statement, answer, cat, source, explanation, d=2):
    return dict(statement=statement, answer=answer, category=cat, source=source, explanation=explanation, difficulty=d)
add('truefalse', [
    T('Zlatna ribica pamti samo tri sekunde.', False, 'Životinje', 'Plymouth University (istraživanja pamćenja riba)', 'Pokusi pokazuju da zlatne ribice pamte mjesecima.'),
    T('Munja nikad ne udari dvaput u isto mjesto.', False, 'Znanost', 'NOAA – Lightning Myths', 'Neboderi poput Empire State Buildinga pogođeni su desetke puta godišnje.'),
    T('Bika razjari crvena boja.', False, 'Životinje', 'Encyclopaedia Britannica', 'Bikovi slabo razlikuju crvenu; reagiraju na pokret plašta.'),
    T('Ljudi koriste samo 10 % mozga.', False, 'Znanost', 'Scientific American', 'Snimke mozga pokazuju da aktivni su gotovo svi dijelovi.'),
    T('Pravilno spremljen med se praktički ne kvari.', True, 'Hrana i piće', 'Smithsonian Magazine', 'U egipatskim grobnicama pronađen je med star tisućama godina.'),
    T('Rajčica je u botaničkom smislu voće.', True, 'Hrana i piće', 'Encyclopaedia Britannica', 'Razvija se iz cvijeta i sadrži sjemenke, pa je botanički plod (bobica).'),
    T('Kikiriki je orašasti plod.', False, 'Hrana i piće', 'Encyclopaedia Britannica', 'Kikiriki je mahunarka, srodnik graha i graška.'),
    T('Pingvini žive na Sjevernom polu.', False, 'Životinje', 'National Geographic', 'Pingvini žive na južnoj polutci; na Arktiku ih nema.', 1),
    T('Venera je najtoplija planeta Sunčeva sustava.', True, 'Znanost', 'NASA – Venus', 'Gusta atmosfera zadržava toplinu pa je toplija i od Merkura.'),
    T('Koala je vrsta medvjeda.', False, 'Životinje', 'Australian Koala Foundation', 'Koala je tobolčar, srodnik klokana.'),
    T('Mona Lisa izložena je u Louvreu.', True, 'Zanimljivosti', 'Musée du Louvre', 'Slika je u Louvreu od Francuske revolucije.', 1),
    T('Napoleon je bio izrazito nizak čovjek.', False, 'Povijest', 'Encyclopaedia Britannica', 'Bio je visok oko 168 cm, prosječno za svoje doba; mit je nastao zbog pogrešnog preračunavanja mjera.'),
    T('Štenci dalmatinca kote se potpuno bijeli.', True, 'Životinje', 'American Kennel Club', 'Točkice se pojavljuju tek nakon nekoliko tjedana.'),
    T('Australija je šira od Mjeseca.', True, 'Geografija', 'NASA; Geoscience Australia', 'Australija je od istoka do zapada široka oko 4000 km, a promjer Mjeseca je 3474 km.'),
    T('Jagoda je u botaničkom smislu bobica.', False, 'Hrana i piće', 'Encyclopaedia Britannica', 'Jagoda nije bobica, a banana jest.', 3),
    T('Vatikan je najmanja država na svijetu.', True, 'Geografija', 'CIA World Factbook', 'Vatikan ima oko 0,44 km².', 1),
    T('Zmije trepću.', False, 'Životinje', 'Encyclopaedia Britannica', 'Zmije nemaju kapke; oči im štiti prozirna ljuska.'),
    T('Mars je crven zbog željeznog oksida, odnosno hrđe.', True, 'Znanost', 'NASA – Mars', 'Prašina bogata željeznim oksidom daje mu crvenkastu boju.'),
    T('Na planini voda vrije na nižoj temperaturi nego na moru.', True, 'Znanost', 'Encyclopaedia Britannica', 'Zbog nižeg tlaka zraka voda na velikoj visini vrije ispod 100 °C.'),
    T('Šišmiši su slijepi.', False, 'Životinje', 'Bat Conservation International', 'Šišmiši vide, a mnogi uz to koriste eholokaciju.'),
    T('Albert Einstein pao je matematiku u školi.', False, 'Povijest', 'Einstein Archives (Hebrejsko sveučilište)', 'Einstein je bio odličan iz matematike; mit potječe iz pogrešno shvaćene ljestvice ocjena.'),
    T('Vikinzi su u bitkama nosili kacige s rogovima.', False, 'Povijest', 'National Museum of Denmark', 'Kacige s rogovima izmislili su kostimografi u 19. stoljeću.'),
    T('Kit je riba.', False, 'Životinje', 'Encyclopaedia Britannica', 'Kitovi su sisavci: dišu plućima i doje mladunčad.', 1),
    T('Plitvička jezera nalaze se na UNESCO-ovu popisu svjetske baštine.', True, 'Hrvatska', 'UNESCO', 'Upisana su 1979. kao jedno od prvih dobara na svijetu.', 1),
    T('Hrvatska ima više od tisuću otoka, otočića i hridi.', True, 'Hrvatska', 'DZS – Statistički ljetopis', 'Ima ih više od 1200, od čega je naseljeno njih oko pedeset.'),
    T('Krv u ljudskim venama je plava.', False, 'Znanost', 'Encyclopaedia Britannica', 'Krv je uvijek crvena; vene samo izgledaju plavo kroz kožu.'),
    T('Mačke na stražnjim šapama imaju po pet prstiju.', False, 'Životinje', 'Cornell Feline Health Center', 'Mačke obično imaju 5 prstiju na prednjim i 4 na stražnjim šapama.', 3),
    T('Žvakaća guma koju progutaš ostaje u želucu sedam godina.', False, 'Znanost', 'Mayo Clinic', 'Guma se ne probavi, ali iz tijela izađe za nekoliko dana.'),
    T('Lav je najveća mačka na svijetu.', False, 'Životinje', 'WWF', 'Najveća mačka je tigar.'),
    T('Polarni medvjedi ispod bijelog krzna imaju crnu kožu.', True, 'Životinje', 'Polar Bears International', 'Crna koža bolje upija toplinu, a dlake su zapravo prozirne.'),
    T('Leonardo da Vinci naslikao je „Posljednju večeru”.', True, 'Zanimljivosti', 'Encyclopaedia Britannica', 'Freska se nalazi u Milanu, u samostanu Santa Maria delle Grazie.', 1),
    T('Mjesec svijetli vlastitim svjetlom.', False, 'Znanost', 'NASA – Moon', 'Mjesec samo odbija Sunčevu svjetlost.', 1),
    T('Sunce je zvijezda.', True, 'Znanost', 'NASA – Sun', 'Sunce je zvijezda tipa žuti patuljak.', 1),
    T('Kravata potječe od marame koju su nosili hrvatski vojnici.', True, 'Hrvatska', 'Academia Cravatica', 'Francuzi su u 17. st. maramu nazvali „à la croate”, odakle riječ cravate.', 1),
    T('Nikola Tesla rođen je u Smiljanu kraj Gospića.', True, 'Hrvatska', 'Hrvatska enciklopedija – Tesla', 'Tesla je rođen 1856. u Smiljanu.', 1),
    T('Žirafa ima više vratnih kralježaka od čovjeka.', False, 'Životinje', 'Smithsonian’s National Zoo', 'I žirafa i čovjek imaju sedam vratnih kralježaka – žirafini su samo puno dulji.'),
    T('Na Mjesecu nema vjetra pa tragovi astronauta mogu ostati milijunima godina.', True, 'Znanost', 'NASA', 'Bez atmosfere i vjetra tragovi s Apolla ostaju netaknuti.'),
    T('Banana je u botaničkom smislu bobica.', True, 'Hrana i piće', 'Encyclopaedia Britannica', 'Banana se razvija iz jednog cvijeta s jednim plodnikom pa je botanički bobica.', 3),
    T('Hobotnica ima devet mozgova.', True, 'Životinje', 'Smithsonian Ocean', 'Jedan središnji mozak i po jedan živčani centar u svakom od osam krakova.', 3),
    T('Eiffelov toranj ljeti je nekoliko centimetara viši nego zimi.', True, 'Zanimljivosti', 'Société d’exploitation de la tour Eiffel', 'Željezo se na toplini širi pa toranj naraste i do 15 cm.'),
])

# --- Veće ili manje (i prije/poslije, sjevernije/južnije) ---
def H(question, options, correct, cat, source, explanation, d=2):
    return dict(question=question, options=options, correct=correct, category=cat, source=source, explanation=explanation, difficulty=d)
VM = ['Više', 'Manje']; PP = ['Prije', 'Poslije']; SJ = ['Sjevernije', 'Južnije']
add('higherlower', [
    H('Ima li Zagreb više ili manje stanovnika od Ljubljane?', VM, 0, 'Geografija', 'DZS; SURS', 'Zagreb ima oko 767 000, a Ljubljana oko 295 000 stanovnika.', 1),
    H('Je li Pariz sjevernije ili južnije od Zagreba?', SJ, 0, 'Geografija', 'Geografske koordinate', 'Pariz je na oko 48,9° N, a Zagreb na 45,8° N.'),
    H('Je li Rim sjevernije ili južnije od New Yorka?', SJ, 0, 'Geografija', 'Geografske koordinate', 'Iznenađenje: Rim (41,9° N) je sjevernije od New Yorka (40,7° N).', 3),
    H('Je li Madrid sjevernije ili južnije od New Yorka?', SJ, 1, 'Geografija', 'Geografske koordinate', 'Madrid je na 40,4° N, malo južnije od New Yorka (40,7° N).', 3),
    H('Ima li Australija više ili manje stanovnika od Rumunjske?', VM, 0, 'Geografija', 'Australian Bureau of Statistics; INS Romania', 'Australija ima oko 27, a Rumunjska oko 19 milijuna stanovnika.'),
    H('Ima li Hrvatska više ili manje stanovnika od Irske?', VM, 1, 'Geografija', 'DZS; CSO Ireland', 'Irska ima oko 5,3 milijuna, a Hrvatska oko 3,9 milijuna stanovnika.'),
    H('Ima li Island više ili manje stanovnika od grada Splita?', VM, 0, 'Geografija', 'Statistics Iceland; DZS', 'Island ima oko 390 000, a Split oko 160 000 stanovnika.'),
    H('Ima li Italija više ili manje stanovnika od Francuske?', VM, 1, 'Geografija', 'ISTAT; INSEE', 'Italija ima oko 59, a Francuska oko 68 milijuna stanovnika.'),
    H('Ima li Japan više ili manje stanovnika od Njemačke?', VM, 0, 'Geografija', 'Statistics Bureau of Japan; Destatis', 'Japan ima oko 124, a Njemačka oko 84 milijuna stanovnika.'),
    H('Je li najdublja točka Jadranskog mora dublja ili plića od 1000 m?', ['Dublja', 'Plića'], 0, 'Geografija', 'Hrvatski hidrografski institut', 'Najdublja točka Jadrana, u Južnojadranskoj kotlini, ima oko 1230 m.', 3),
    H('Je li Venera veća ili manja od Zemlje?', ['Veća', 'Manja'], 1, 'Znanost', 'NASA – Planetary Fact Sheet', 'Venera je nešto manja: promjer joj je oko 95 % Zemljinog.'),
    H('Je li Mjesec veći ili manji od Plutona?', ['Veći', 'Manji'], 0, 'Znanost', 'NASA', 'Mjesec ima promjer 3474 km, a Pluton 2377 km.'),
    H('Je li Sahara veća ili manja od Australije?', ['Veća', 'Manja'], 0, 'Geografija', 'National Geographic; Geoscience Australia', 'Sahara ima oko 9,2, a Australija 7,7 milijuna km².', 3),
    H('Je li Dunav dulji ili kraći od Rajne?', ['Dulji', 'Kraći'], 0, 'Geografija', 'Encyclopaedia Britannica', 'Dunav je dug oko 2850 km, a Rajna oko 1230 km.'),
    H('Je li Eiffelov toranj viši ili niži od 400 m?', ['Viši', 'Niži'], 1, 'Geografija', 'Société d’exploitation de la tour Eiffel', 'Eiffelov toranj ima 330 m.'),
    H('Je li Sljeme više ili niže od 1000 m?', ['Više', 'Niže'], 0, 'Hrvatska', 'Hrvatska enciklopedija', 'Sljeme je visoko 1033 m.'),
    H('Je li „Titanic” izašao prije ili poslije „Jurskog parka”?', PP, 1, 'Filmovi i serije', 'AFI Catalog', '„Jurski park” izašao je 1993., a „Titanic” 1997.'),
    H('Je li Google osnovan prije ili poslije Amazona?', PP, 1, 'Tehnologija', 'Google; Amazon', 'Amazon je osnovan 1994., a Google 1998.'),
    H('Je li prvi film o Harryju Potteru izašao prije ili poslije prvog „Gospodara prstenova”?', PP, 0, 'Filmovi i serije', 'Warner Bros.; New Line Cinema', 'Oba su izašla 2001.: Harry Potter u studenom, Gospodar prstenova u prosincu.', 3),
    H('Je li prvi „Shrek” izašao prije ili poslije prvog „Ledenog doba”?', PP, 0, 'Filmovi i serije', 'DreamWorks; Blue Sky Studios', '„Shrek” je izašao 2001., a „Ledeno doba” 2002.'),
    H('Jesu li Beatlesi osnovani prije ili poslije Rolling Stonesa?', PP, 0, 'Glazba', 'Encyclopaedia Britannica', 'Beatlesi su osnovani 1960., Rolling Stonesi 1962.'),
    H('Ima li banana više ili manje kalorija od jabuke (na 100 grama)?', VM, 0, 'Hrana i piće', 'USDA FoodData Central', 'Banana ima oko 89, a jabuka oko 52 kcal na 100 g.'),
    H('Ima li odrasla osoba više ili manje od 200 kostiju?', VM, 0, 'Znanost', 'Encyclopaedia Britannica', 'Odrasla osoba ima 206 kostiju.'),
    H('Je li Mona Lisa viša ili niža od jednog metra?', ['Viša', 'Niža'], 1, 'Zanimljivosti', 'Musée du Louvre', 'Slika je visoka samo 77 cm.'),
    H('Je li Nil dulji ili kraći od Dunava?', ['Dulji', 'Kraći'], 0, 'Geografija', 'Encyclopaedia Britannica', 'Nil je dug oko 6650 km.', 1),
    H('Je li Mount Everest viši ili niži od 9000 m?', ['Viši', 'Niži'], 1, 'Geografija', 'Kinesko-nepalsko mjerenje 2020.', 'Everest ima 8849 m.'),
    H('Je li Split sjevernije ili južnije od Rima?', SJ, 0, 'Geografija', 'Geografske koordinate', 'Split je na 43,5° N, a Rim na 41,9° N.'),
    H('Ima li Kanada više ili manje stanovnika od Poljske?', VM, 0, 'Geografija', 'Statistics Canada; GUS', 'Kanada ima oko 40, a Poljska oko 37 milijuna stanovnika.', 3),
    H('Je li Michael Jackson rođen prije ili poslije Madonne?', PP, 1, 'Glazba', 'Encyclopaedia Britannica', 'Oboje su rođeni 1958.: Madonna 16., a Michael Jackson 29. kolovoza – dakle poslije!', 3),
])

# --- Poredaj po redu ---
def O(prompt, items, values, cat, source, explanation, d=2):
    return dict(prompt=prompt, items=items, values=values, category=cat, source=source, explanation=explanation, difficulty=d)
add('order', [
    O('Poredaj gradove po broju stanovnika – od najvećeg.', ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar'], ['≈ 767 000', '≈ 161 000', '≈ 108 000', '≈ 96 000', '≈ 70 000'], 'Hrvatska', 'DZS – Popis 2021.', 'Prema popisu 2021.'),
    O('Poredaj životinje po najvećoj brzini – od najbrže.', ['Gepard', 'Konj', 'Čovjek', 'Kornjača'], ['≈ 110 km/h', '≈ 88 km/h', '≈ 44 km/h', '< 1 km/h'], 'Životinje', 'Smithsonian; World Athletics', 'Usain Bolt je u sprintu dosegnuo oko 44 km/h.', 1),
    O('Poredaj vrhove po visini – od najvišeg.', ['Mount Everest', 'Mont Blanc', 'Triglav', 'Dinara (Sinjal)', 'Sljeme'], ['8849 m', '4806 m', '2864 m', '1831 m', '1033 m'], 'Geografija', 'Hrvatska enciklopedija; Britannica', 'Dinara je najviši vrh Hrvatske.'),
    O('Poredaj države po broju stanovnika – od najveće.', ['Njemačka', 'Francuska', 'Italija', 'Španjolska', 'Hrvatska'], ['≈ 84 mil.', '≈ 68 mil.', '≈ 59 mil.', '≈ 48 mil.', '≈ 3,9 mil.'], 'Geografija', 'Eurostat', 'Podaci Eurostata za 2023.'),
    O('Poredaj izume kronološki – od najstarijeg.', ['Gutenbergov tiskarski stroj', 'Telefon', 'Televizija', 'Mobitel', 'iPhone'], ['oko 1450.', '1876.', '1920-ih', '1973.', '2007.'], 'Tehnologija', 'Encyclopaedia Britannica', 'Prvi poziv mobitelom upućen je 1973.'),
    O('Poredaj događaje kronološki – od najranijeg.', ['Pad Zapadnog Rimskog Carstva', 'Kolumbo stiže u Ameriku', 'Francuska revolucija', 'Početak Prvog svjetskog rata'], ['476.', '1492.', '1789.', '1914.'], 'Povijest', 'Encyclopaedia Britannica', 'Od pada Rima do Kolumba prošlo je više od tisuću godina.'),
    O('Poredaj rijeke po duljini – od najdulje.', ['Dunav', 'Rajna', 'Sava', 'Drava', 'Kupa'], ['≈ 2850 km', '≈ 1230 km', '≈ 950 km', '≈ 750 km', '≈ 300 km'], 'Geografija', 'Hrvatska enciklopedija; Britannica', 'Sava je najdulja rijeka koja teče kroz Hrvatsku.'),
    O('Poredaj životinje po masi – od najteže.', ['Plavetni kit', 'Afrički slon', 'Konj', 'Čovjek', 'Mačka'], ['do 150 t', 'do 6 t', '≈ 500 kg', '≈ 70 kg', '≈ 4 kg'], 'Životinje', 'Smithsonian; WWF', 'Plavetni kit najteža je životinja koja je ikad živjela.', 1),
    O('Poredaj Pixarove filmove po godini izlaska – od najstarijeg.', ['Priča o igračkama', 'Potraga za Nemom', 'Auti', 'Nebesa (Up)', 'Izvrnuto obrnuto'], ['1995.', '2003.', '2006.', '2009.', '2015.'], 'Filmovi i serije', 'Pixar', '„Priča o igračkama” bila je prvi potpuno računalno animirani film.'),
    O('Poredaj domaćine nogometnih Svjetskih prvenstava kronološki – od najranijeg.', ['Francuska', 'Japan i Južna Koreja', 'Njemačka', 'Južna Afrika', 'Brazil'], ['1998.', '2002.', '2006.', '2010.', '2014.'], 'Sport', 'FIFA', 'Hrvatska je 1998. u Francuskoj osvojila broncu.'),
    O('Poredaj kontinente po površini – od najvećeg.', ['Azija', 'Afrika', 'Sjeverna Amerika', 'Europa', 'Australija'], ['≈ 44 mil. km²', '≈ 30 mil. km²', '≈ 24 mil. km²', '≈ 10 mil. km²', '≈ 8,5 mil. km²'], 'Geografija', 'National Geographic', 'Australija s Oceanijom najmanji je kontinent.'),
    O('Poredaj oceane po veličini – od najvećeg.', ['Tihi', 'Atlantski', 'Indijski', 'Južni', 'Arktički'], ['≈ 165 mil. km²', '≈ 106 mil. km²', '≈ 70 mil. km²', '≈ 22 mil. km²', '≈ 14 mil. km²'], 'Geografija', 'NOAA', 'Arktički ocean najmanji je i najplići.'),
    O('Poredaj knjige o Harryju Potteru redom izlaska.', ['Kamen mudraca', 'Odaja tajni', 'Zatočenik Azkabana', 'Plameni pehar', 'Red feniksa'], ['1997.', '1998.', '1999.', '2000.', '2003.'], 'Filmovi i serije', 'Bloomsbury', 'Serijal ima ukupno sedam knjiga.', 1),
    O('Poredaj po broju nogu – od najviše.', ['Pauk', 'Mrav', 'Pas', 'Kokoš', 'Zmija'], ['8', '6', '4', '2', '0'], 'Životinje', 'Encyclopaedia Britannica', 'Pauk nije kukac – ima osam nogu.', 1),
    O('Poredaj planete po veličini – od najveće.', ['Jupiter', 'Saturn', 'Zemlja', 'Mars', 'Merkur'], ['≈ 139 800 km', '≈ 116 500 km', '≈ 12 700 km', '≈ 6800 km', '≈ 4900 km'], 'Znanost', 'NASA – Planetary Fact Sheet', 'Merkur je najmanja planeta Sunčeva sustava.'),
    O('Poredaj filmove po godini izlaska – od najstarijeg.', ['Ratovi zvijezda', 'E.T.', 'Jurski park', 'Avatar', 'Oppenheimer'], ['1977.', '1982.', '1993.', '2009.', '2023.'], 'Filmovi i serije', 'AFI Catalog', 'Sva četiri prva filma režirali su Lucas, Spielberg i Cameron.'),
])

# --- Izbaci uljeza ---
def U(items, odd, explanation, prompt=None, cat='Zanimljivosti', d=1):
    q = dict(items=items, odd=odd, explanation=explanation, category=cat, difficulty=d)
    if prompt: q['prompt'] = prompt
    return q
add('oddone', [
    U(['Pariz', 'London', 'Madrid', 'Sydney', 'Berlin'], 3, 'Sydney nije glavni grad – glavni grad Australije je Canberra.', cat='Geografija', d=2),
    U(['Ruža', 'Tulipan', 'Ljiljan', 'Hrast', 'Orhideja'], 3, 'Hrast je stablo, a ostalo su cvjetovi.'),
    U(['Krokodil', 'Kornjača', 'Zmija', 'Žaba', 'Gušter'], 3, 'Žaba je vodozemac, a ostali su gmazovi.', cat='Životinje', d=2),
    U(['Mozart', 'Beethoven', 'Bach', 'Picasso', 'Chopin'], 3, 'Picasso je slikar, ostali su skladatelji.', cat='Glazba'),
    U(['Mars', 'Jupiter', 'Sunce', 'Saturn', 'Venera'], 2, 'Sunce je zvijezda, ostalo su planeti.', cat='Znanost'),
    U(['Nogomet', 'Košarka', 'Odbojka', 'Tenis', 'Rukomet'], 3, 'Tenis nije momčadski sport.', cat='Sport'),
    U(['Sava', 'Drava', 'Dunav', 'Kupa', 'Bajkal'], 4, 'Bajkal je jezero, ostalo su rijeke.', cat='Geografija'),
    U(['Mlijeko', 'Sir', 'Jogurt', 'Maslac', 'Jaje'], 4, 'Jaje nije mliječni proizvod.', cat='Hrana i piće'),
    U(['Shakespeare', 'Hemingway', 'Tolkien', 'Van Gogh', 'Dickens'], 3, 'Van Gogh je slikar, ostali su pisci.'),
    U(['Trokut', 'Kvadrat', 'Krug', 'Kocka', 'Pravokutnik'], 3, 'Kocka je tijelo (3D), ostalo su likovi u ravnini.', cat='Znanost'),
    U(['Leptir', 'Pčela', 'Pauk', 'Mrav', 'Muha'], 2, 'Pauk nije kukac – ima osam nogu.', cat='Životinje', d=2),
    U(['Zagreb', 'Split', 'Rijeka', 'Mostar', 'Osijek'], 3, 'Mostar je u Bosni i Hercegovini.', cat='Geografija'),
    U(['Gitara', 'Violina', 'Bubanj', 'Harfa', 'Violončelo'], 2, 'Bubanj nije žičani instrument.', cat='Glazba'),
    U(['Pingvin', 'Noj', 'Kivi', 'Emu', 'Orao'], 4, 'Orao leti, ostale ptice ne mogu letjeti.', cat='Životinje', d=2),
    U(['Merkur', 'Venera', 'Zemlja', 'Mars', 'Pluton'], 4, 'Pluton je od 2006. patuljasti planet.', cat='Znanost', d=2),
    U(['Ožujak', 'Svibanj', 'Ponedjeljak', 'Kolovoz', 'Studeni'], 2, 'Ponedjeljak je dan, ostalo su mjeseci.'),
    U(['Rajčica', 'Krastavac', 'Mrkva', 'Paprika', 'Patlidžan'], 2, 'Mrkva je korijen; ostalo su botanički plodovi.', cat='Hrana i piće', d=3),
    U(['Messi', 'Ronaldo', 'Modrić', 'Federer', 'Neymar'], 3, 'Federer je tenisač, ostali su nogometaši.', cat='Sport'),
    U(['Hvar', 'Brač', 'Korčula', 'Vis', 'Istra'], 4, 'Istra je poluotok, ostalo su otoci.', cat='Hrvatska'),
    U(['Sarma', 'Ćevapi', 'Peka', 'Sushi', 'Štrukli'], 3, 'Sushi je japansko jelo, ostala su jela s ovih prostora.', cat='Hrana i piće'),
])

# --- Riskiraj bodove ---
def R(question, options, correct, cat, source, explanation, d=2):
    return dict(question=question, options=options, correct=correct, category=cat, source=source, explanation=explanation, difficulty=d)
add('risk', [
    R('Koja je najveća planeta Sunčeva sustava?', ['Saturn', 'Jupiter', 'Neptun', 'Uran'], 1, 'Znanost', 'NASA', 'U Jupiter bi stalo više od 1300 Zemalja.', 1),
    R('Koji je glavni grad Japana?', ['Kyoto', 'Osaka', 'Tokio', 'Hirošima'], 2, 'Geografija', 'Government of Japan', 'Tokio je glavni grad od 1868.', 1),
    R('Tko je naslikao „Zvjezdanu noć”?', ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso', 'Salvador Dalí'], 1, 'Zanimljivosti', 'MoMA', 'Van Gogh ju je naslikao 1889.'),
    R('Koja je najveća država na svijetu po površini?', ['Kanada', 'Kina', 'SAD', 'Rusija'], 3, 'Geografija', 'CIA World Factbook', 'Rusija ima oko 17 milijuna km².', 1),
    R('Koji je metal tekuć na sobnoj temperaturi?', ['Olovo', 'Živa', 'Kositar', 'Aluminij'], 1, 'Znanost', 'IUPAC', 'Živa se tali već na −39 °C.'),
    R('U kojem se gradu nalazi Kip slobode?', ['Washington', 'Boston', 'New York', 'Chicago'], 2, 'Geografija', 'National Park Service', 'Kip stoji na otoku Liberty Island u njujorškoj luci.', 1),
    R('Tko je napisao „Romea i Juliju”?', ['Charles Dickens', 'William Shakespeare', 'Victor Hugo', 'Dante Alighieri'], 1, 'Zanimljivosti', 'Encyclopaedia Britannica', 'Tragedija je napisana oko 1595.', 1),
    R('Koja je službena valuta Švicarske?', ['Euro', 'Švicarski franak', 'Švicarska kruna', 'Funta'], 1, 'Zanimljivosti', 'Swiss National Bank', 'Švicarska nije u eurozoni.'),
    R('Koje je boje „crna kutija” u zrakoplovu?', ['Crne', 'Narančaste', 'Bijele', 'Crvene'], 1, 'Tehnologija', 'NTSB', 'Narančasta je zbog lakšeg pronalaženja nakon nesreće.'),
    R('Koja je najviša planina Afrike?', ['Mount Kenya', 'Kilimandžaro', 'Atlas', 'Ruwenzori'], 1, 'Geografija', 'UNESCO – Kilimanjaro', 'Kilimandžaro ima 5895 m.'),
    R('Koje je godine počeo Drugi svjetski rat?', ['1914.', '1933.', '1939.', '1941.'], 2, 'Povijest', 'Encyclopaedia Britannica', 'Rat je počeo njemačkim napadom na Poljsku 1. rujna 1939.', 1),
    R('Koja je država osvojila prvo nogometno Svjetsko prvenstvo?', ['Brazil', 'Italija', 'Urugvaj', 'Argentina'], 2, 'Sport', 'FIFA', 'Urugvaj je bio domaćin i pobjednik 1930.'),
    R('Koliko igrača jedne momčadi igra na terenu u odbojci?', ['5', '6', '7', '9'], 1, 'Sport', 'FIVB', 'Šest igrača po momčadi.'),
    R('Tko je glumio Jamesa Bonda u filmu „Casino Royale” (2006.)?', ['Pierce Brosnan', 'Daniel Craig', 'Sean Connery', 'Roger Moore'], 1, 'Filmovi i serije', 'EON Productions', 'Bio je to Craigov prvi film o Bondu.'),
    R('Što je uz meso i rižu glavni sastojak sarme?', ['Kiseli kupus', 'Blitva', 'Paprika', 'Vinova loza'], 0, 'Hrana i piće', 'Hrvatska enciklopedija – sarma', 'Kontinentalna sarma radi se u listovima kiselog kupusa.', 1),
    R('Koja je ptica simbol mira?', ['Lastavica', 'Golub', 'Labud', 'Roda'], 1, 'Zanimljivosti', 'Encyclopaedia Britannica', 'Bijeli golub s maslinovom grančicom.', 1),
    R('Koji jezik ima najviše izvornih govornika?', ['Engleski', 'Španjolski', 'Mandarinski kineski', 'Hindski'], 2, 'Zanimljivosti', 'Ethnologue', 'Mandarinski ima više od 900 milijuna izvornih govornika.'),
    R('Koliko komora ima ljudsko srce?', ['2', '3', '4', '6'], 2, 'Znanost', 'Encyclopaedia Britannica', 'Dvije pretklijetke i dvije klijetke.'),
    R('Koji je najmanji kontinent?', ['Europa', 'Australija', 'Antarktika', 'Južna Amerika'], 1, 'Geografija', 'National Geographic', 'Australija (s Oceanijom) ima oko 8,5 milijuna km².'),
    R('Tko je otkrio penicilin?', ['Louis Pasteur', 'Alexander Fleming', 'Robert Koch', 'Marie Curie'], 1, 'Znanost', 'Nobel Prize', 'Fleming ga je otkrio 1928.'),
    R('U kojoj se državi nalaze piramide u Gizi?', ['Meksiku', 'Egiptu', 'Sudanu', 'Iraku'], 1, 'Geografija', 'UNESCO', 'Velika piramida jedino je preživjelo od sedam svjetskih čuda.', 1),
    R('Tko je prvi hodao po Mjesecu?', ['Buzz Aldrin', 'Jurij Gagarin', 'Neil Armstrong', 'Michael Collins'], 2, 'Znanost', 'NASA – Apollo 11', 'Armstrong je izašao na Mjesec 21. srpnja 1969. (UTC).', 1),
    R('Koji je najveći grad u SAD-u?', ['Los Angeles', 'Chicago', 'New York', 'Houston'], 2, 'Geografija', 'US Census Bureau', 'New York ima oko 8,3 milijuna stanovnika.', 1),
    R('Koja je životinja simbol WWF-a?', ['Tigar', 'Panda', 'Koala', 'Slon'], 1, 'Životinje', 'WWF', 'Logo s pandom koristi se od 1961.', 1),
    R('Koja je kemijska formula vode?', ['CO₂', 'H₂O', 'O₂', 'NaCl'], 1, 'Znanost', 'IUPAC', 'Dva atoma vodika i jedan atom kisika.', 1),
    R('Kako se zove najveći koraljni greben na svijetu?', ['Crveni greben', 'Veliki koraljni greben', 'Mezoamerički greben', 'Maldivski greben'], 1, 'Geografija', 'UNESCO – Great Barrier Reef', 'Proteže se oko 2300 km uz obalu Australije.', 1),
])

# --- Što kaže narod? (procijenjeni odgovori) ---
def F(question, answers):
    pts = [30, 25, 20, 15, 10] if len(answers) == 5 else None
    out = []
    for i, a in enumerate(answers):
        text, *acc = a.split('|')
        out.append({'text': text, 'points': pts[i] if pts else 10, **({'accept': acc} if acc else {})})
    return dict(question=question, estimated=True, answers=out, difficulty=1)
add('feud', [
    F('Što ljudi najčešće rade nedjeljom ujutro?', ['Spavaju dulje|spavaju|spavanje', 'Piju kavu|kava', 'Doručkuju|doručak', 'Idu na misu|misa|crkva', 'Šetaju|šetnja']),
    F('Što se najčešće nađe u ženskoj torbici?', ['Novčanik|novčanik', 'Mobitel|telefon', 'Ključevi|ključ', 'Ruž|ruž za usne|šminka', 'Maramice|papirnate maramice']),
    F('Koje se jelo najčešće jede za Božić?', ['Sarma', 'Purica|puretina|pura', 'Bakalar', 'Odojak|pečenka|pečenje', 'Francuska salata|salata']),
    F('Što ljudi rade kad ne mogu zaspati?', ['Gledaju mobitel|mobitel|telefon', 'Broje ovce|ovce', 'Čitaju|knjiga', 'Piju čaj|čaj|mlijeko|vodu', 'Gledaju televiziju|tv|televizor']),
    F('Što ljudi najčešće zaborave na plaži?', ['Ručnik', 'Sunčane naočale|naočale', 'Kremu za sunčanje|krema', 'Japanke|papuče', 'Igračke|lopta']),
    F('Što ljudi rade dok čekaju u redu?', ['Gledaju mobitel|mobitel|telefon', 'Uzdišu|nervoziraju', 'Razgovaraju|pričaju', 'Gledaju na sat|sat', 'Ogovaraju']),
    F('Koji je najpopularniji kućni ljubimac?', ['Pas|psa', 'Mačka|mačku', 'Ribica|riba', 'Papiga|ptica', 'Hrčak|zamorac']),
    F('Što ljudi kupe na benzinskoj osim goriva?', ['Kavu|kava', 'Cigarete', 'Vodu|piće', 'Grickalice|čips', 'Novine']),
    F('Što ljudi najčešće zaborave kod kuće kad idu na posao?', ['Mobitel|telefon', 'Ključeve|ključ', 'Ručak|užinu', 'Novčanik', 'Naočale']),
    F('Što ljudi rade na prvom spoju?', ['Idu na večeru|večera', 'Idu na kavu|kava', 'Šeću|šetnja', 'Idu u kino|kino', 'Razgovaraju satima|pričaju']),
    F('Što se najčešće peče na roštilju?', ['Ćevapi|ćevape', 'Kobasice', 'Pljeskavice', 'Riba|ribu', 'Piletina|piletinu|krilca']),
    F('Koji sport ljudi najradije gledaju na televiziji?', ['Nogomet', 'Rukomet', 'Tenis', 'Košarka', 'Formula 1|formula']),
    F('Što prvo napraviš kad zazvoni budilica?', ['Odgodim je|odgodim|snooze', 'Ustanem|dignem se', 'Opsujem|psujem', 'Ugasim je|ugasim', 'Pogledam mobitel|mobitel']),
    F('Što ljudi rade u autu dok stoje u gužvi?', ['Slušaju radio|radio|glazba', 'Gledaju mobitel|mobitel', 'Pjevaju', 'Psuju|ljute se', 'Jedu']),
    F('Koji je najčešći razlog svađe u paru?', ['Novac|novci|lova', 'Kućanski poslovi|čišćenje|poslovi', 'Ljubomora', 'Rodbina|punica|svekrva', 'Mobitel|telefon']),
    F('Što ljudi rade kad im je dosadno?', ['Gledaju mobitel|mobitel', 'Spavaju', 'Gledaju televiziju|tv', 'Jedu|grickaju', 'Čiste|spremaju']),
    F('Što ljudi kupuju na adventu?', ['Kuhano vino|vino', 'Fritule', 'Kobasicu|kobasice', 'Poklone|poklon', 'Medenjake|kolače']),
    F('Što ljudi najčešće slave?', ['Rođendan', 'Novu godinu|doček', 'Božić', 'Godišnjicu|godišnjica', 'Imendan']),
    F('Što ljudi rade kad im nestane struje?', ['Pale svijeće|svijeća', 'Traže bateriju|lampa|svjetiljka', 'Zovu elektru|zovu', 'Provjere osigurače|osigurači', 'Idu spavati|spavaju']),
    F('Što ljudi prvo kupe kad se usele u novi stan?', ['Krevet|madrac', 'Hladnjak|frižider', 'Kauč|sofu', 'Zavjese', 'Perilicu|mašinu za veš']),
])

# --- Pogodi po opisu (poznate osobe, filmovi, životinje, države) ---
def D(subject, clues, answer, accept=None, cat=None, d=2):
    q = dict(subject=subject, clues=clues, answer=answer, difficulty=d)
    if accept: q['accept'] = accept
    if cat: q['category'] = cat
    return q
add('describe', [
    D('Osoba', ['Rođen sam 1985. u Zadru.', 'Igrao sam za Tottenham i Real Madrid.', 'Godine 2018. osvojio sam Zlatnu loptu.', 'Kapetan sam hrvatske nogometne reprezentacije.'], 'Luka Modrić', ['modric', 'modrić', 'luka'], 'Sport', 1),
    D('Osoba', ['Rođen sam u Njemačkoj 1879.', 'Nobelovu nagradu dobio sam za fotoelektrični efekt.', 'Moja najpoznatija formula ima samo tri slova.', 'Autor sam teorije relativnosti.'], 'Albert Einstein', ['einstein'], 'Znanost', 1),
    D('Film', ['Radnja se odvija u Africi.', 'Glazbu su pisali Elton John i Hans Zimmer.', 'Zli stric zove se Scar.', 'Glavni lik je mladi lav Simba.'], 'Kralj lavova', ['lion king'], 'Filmovi i serije', 1),
    D('Životinja', ['Ne mogu letjeti, ali odlično plivam.', 'Mužjak moje najveće vrste grije jaje na nogama.', 'Izgledam kao da nosim frak.', 'Najviše nas živi na Antarktici.'], 'Pingvin', None, 'Životinje', 1),
    D('Država', ['Na mojem su tlu tisuće otoka i mnogo vulkana.', 'Poznata sam po brzim vlakovima šinkansenima.', 'Zastava mi je bijela s crvenim krugom.', 'Glavni grad mi je Tokio.'], 'Japan', None, 'Geografija', 1),
    D('Jelo', ['Kuham se dugo, u velikom loncu.', 'Omotana sam u list.', 'Punjena sam mljevenim mesom i rižom.', 'List oko mene je kiseli kupus.'], 'Sarma', None, 'Hrana i piće', 1),
    D('Predmet', ['Izumio me mađarski arhitekt.', 'Imam 54 obojena kvadratića.', 'Postoje natjecanja u tome tko me brže složi.', 'Kocka sam od šest boja.'], 'Rubikova kocka', ['rubik', 'rubikova'], 'Zanimljivosti', 1),
    D('Osoba', ['Rođen sam u Salzburgu.', 'Skladao sam već kao dijete.', 'Napisao sam operu „Čarobna frula”.', 'Ime mi je Wolfgang Amadeus.'], 'Wolfgang Amadeus Mozart', ['mozart'], 'Glazba', 1),
    D('Lik', ['Djetinjstvo sam proveo u ormaru pod stepenicama.', 'Najbolji prijatelj mi ima crvenu kosu i puno braće.', 'Imam ožiljak u obliku munje.', 'Učim u Hogwartsu.'], 'Harry Potter', ['potter', 'hari poter'], 'Filmovi i serije', 1),
    D('Životinja', ['Aktivan sam noću.', 'Snalazim se pomoću eholokacije.', 'Spavam naglavačke.', 'Jedini sam sisavac koji zaista leti.'], 'Šišmiš', ['sismis'], 'Životinje', 1),
    D('Država', ['Unutar mojih granica nalaze se dvije druge države.', 'Poznata sam po tjestenini i operi.', 'Oblikom podsjećam na čizmu.', 'Glavni grad mi je Rim.'], 'Italija', None, 'Geografija', 1),
    D('Predmet', ['Često me zaboraviš u kafiću ili tramvaju.', 'Imam žbice i platno.', 'Otvaram se kad zatreba.', 'Štitim te od kiše.'], 'Kišobran', ['kisobran'], 'Zanimljivosti', 1),
    D('Osoba', ['Rođen sam na Zanzibaru.', 'Pravo ime mi je Farrokh Bulsara.', 'Nastupio sam na koncertu Live Aid 1985.', 'Bio sam pjevač grupe Queen.'], 'Freddie Mercury', ['mercury', 'freddie'], 'Glazba', 2),
    D('Slastica', ['Najčešće me jedeš u prosincu.', 'Pržim se u vrućem ulju.', 'Posipaju me šećerom u prahu.', 'Male sam okrugle dalmatinske krafnice.'], 'Fritule', ['fritula', 'fritule'], 'Hrana i piće', 1),
    D('Životinja', ['Mogu skočiti i više od osam metara u dalj.', 'Rep mi služi kao oslonac.', 'Mladunče nosim u torbi.', 'Simbol sam Australije.'], 'Klokan', None, 'Životinje', 1),
    D('Grad', ['U mojem starom dijelu nema automobila.', 'Poznat sam po karnevalu i maskama.', 'Imam gondole.', 'Izgrađen sam na kanalima.'], 'Venecija', ['venezia', 'venecia'], 'Geografija', 1),
    D('Lik', ['Imam prijatelja magarca koji ne prestaje pričati.', 'Živim u močvari.', 'Zaljubio sam se u princezu Fionu.', 'Ja sam zeleni div.'], 'Shrek', ['srek'], 'Filmovi i serije', 1),
    D('Osoba', ['Rođena sam u Varšavi.', 'Prva sam žena koja je dobila Nobelovu nagradu.', 'Nobelovu nagradu dobila sam dvaput.', 'Otkrila sam radij i polonij.'], 'Marie Curie', ['curie', 'marija curie', 'marie kiri'], 'Znanost', 2),
    D('Predmet', ['18. listopada je moj dan.', 'Moje ime dolazi od riječi kojom su Francuzi nazivali Hrvate.', 'Najčešće me nosiš na poslovnim sastancima.', 'Vežem se oko vrata.'], 'Kravata', None, 'Hrvatska', 1),
    D('Država', ['Kroz mene teče najdulja rijeka Afrike.', 'Na mom je tlu Sueski kanal.', 'Poznata sam po faraonima.', 'Kod mene su piramide u Gizi.'], 'Egipat', None, 'Geografija', 1),
])

# --- Nabroji tri (jasni zadaci s primjerima za automatsko priznavanje) ---
def L(prompt, examples):
    return dict(prompt=prompt, examples=examples, difficulty=1)
add('list3', [
    L('Nabroji tri hrvatska otoka.', ['Krk', 'Cres', 'Brač', 'Hvar', 'Korčula', 'Pag', 'Rab', 'Vis', 'Mljet', 'Lošinj', 'Dugi otok', 'Šolta', 'Čiovo', 'Lastovo', 'Ugljan', 'Pašman', 'Murter', 'Silba', 'Olib']),
    L('Nabroji tri jela s roštilja.', ['Ćevapi', 'Kobasice', 'Pljeskavica', 'Ražnjići', 'Piletina', 'Krilca', 'Riba', 'Lignje', 'Kotleti', 'Rebarca', 'Povrće', 'Hamburger', 'Steak']),
    L('Nabroji tri sporta s loptom.', ['Nogomet', 'Košarka', 'Rukomet', 'Odbojka', 'Tenis', 'Vaterpolo', 'Ragbi', 'Golf', 'Stolni tenis', 'Bejzbol', 'Kriket', 'Hokej na travi', 'Futsal', 'Badminton']),
    L('Nabroji tri voćke crvene boje.', ['Jagoda', 'Trešnja', 'Višnja', 'Malina', 'Jabuka', 'Lubenica', 'Ribiz', 'Brusnica', 'Nar', 'Grejp', 'Šipak']),
    L('Nabroji tri europska glavna grada.', ['Zagreb', 'Beč', 'Pariz', 'Rim', 'Berlin', 'Madrid', 'London', 'Lisabon', 'Prag', 'Budimpešta', 'Ljubljana', 'Varšava', 'Atena', 'Dublin', 'Oslo', 'Stockholm', 'Helsinki', 'Bruxelles', 'Amsterdam', 'Sarajevo', 'Beograd']),
    L('Nabroji tri životinje koje žive u moru.', ['Dupin', 'Kit', 'Morski pas', 'Hobotnica', 'Lignja', 'Rak', 'Riba', 'Tuljan', 'Meduza', 'Morska zvijezda', 'Kornjača', 'Jastog', 'Školjka', 'Hlap']),
    L('Nabroji tri marke automobila.', ['Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Opel', 'Renault', 'Peugeot', 'Fiat', 'Toyota', 'Škoda', 'Ford', 'Rimac', 'Tesla', 'Ferrari', 'Kia', 'Hyundai', 'Volvo', 'Dacia', 'Citroën', 'Seat']),
    L('Nabroji tri društvene igre.', ['Čovječe ne ljuti se', 'Monopoly', 'Šah', 'Scrabble', 'Activity', 'Uno', 'Catan', 'Dama', 'Tabla', 'Riziko', 'Cluedo', 'Domino', 'Briškula', 'Trešeta', 'Belot']),
    L('Nabroji tri kolača.', ['Sacher torta', 'Kremšnita', 'Orehnjača', 'Makovnjača', 'Štrudla', 'Tiramisu', 'Cheesecake', 'Rožata', 'Paprenjaci', 'Fritule', 'Medenjaci', 'Pita od jabuka', 'Krafne', 'Bajadera']),
    L('Nabroji tri planeta Sunčeva sustava.', ['Merkur', 'Venera', 'Zemlja', 'Mars', 'Jupiter', 'Saturn', 'Uran', 'Neptun']),
    L('Nabroji tri glazbena instrumenta.', ['Gitara', 'Klavir', 'Violina', 'Bubanj', 'Flauta', 'Truba', 'Saksofon', 'Harmonika', 'Tamburica', 'Violončelo', 'Klarinet', 'Harfa', 'Bas', 'Sintesajzer']),
    L('Nabroji tri rijeke u Hrvatskoj.', ['Sava', 'Drava', 'Dunav', 'Kupa', 'Korana', 'Mrežnica', 'Dobra', 'Una', 'Krka', 'Cetina', 'Neretva', 'Zrmanja', 'Mura', 'Lika', 'Bosut', 'Mirna', 'Raša']),
    L('Nabroji tri Disneyjeve princeze.', ['Snjeguljica', 'Pepeljuga', 'Trnoružica', 'Ariel', 'Bella', 'Jasmin', 'Pocahontas', 'Mulan', 'Tiana', 'Rapunzel', 'Merida', 'Moana', 'Elsa', 'Anna']),
    L('Nabroji tri stvari koje se uvijek nađu u hladnjaku.', ['Mlijeko', 'Jaja', 'Sir', 'Maslac', 'Jogurt', 'Salama', 'Šunka', 'Senf', 'Majoneza', 'Kečap', 'Pivo', 'Voda', 'Povrće', 'Ostaci ručka']),
    L('Nabroji tri filma s Tomom Hanksom.', ['Forrest Gump', 'Brodolomac', 'Spašavanje vojnika Ryana', 'Philadelphia', 'Zelena milja', 'Terminal', 'Uhvati me ako možeš', 'Apollo 13', 'Veliki', 'Priča o igračkama', 'Da Vincijev kod']),
    L('Nabroji tri hrvatska pjevača ili pjevačice.', ['Oliver Dragojević', 'Gibonni', 'Severina', 'Doris Dragović', 'Tony Cetinski', 'Massimo', 'Mišo Kovač', 'Nina Badrić', 'Jelena Rozga', 'Baby Lasagna', 'Petar Grašo', 'Josipa Lisac', 'Vanna', 'Let 3', 'Tereza Kesovija']),
    L('Nabroji tri ptice.', ['Vrabac', 'Golub', 'Lastavica', 'Orao', 'Sova', 'Roda', 'Galeb', 'Kos', 'Papiga', 'Kokoš', 'Patka', 'Labud', 'Djetlić', 'Svraka', 'Vrana', 'Pingvin', 'Noj']),
    L('Nabroji tri superjunaka.', ['Superman', 'Batman', 'Spider-Man', 'Iron Man', 'Wonder Woman', 'Hulk', 'Thor', 'Kapetan Amerika', 'Black Panther', 'Flash', 'Aquaman', 'Wolverine']),
])

# --- Kategorijski dvoboj (široke kategorije s mnogo primjera) ---
def K(topic, examples):
    return dict(topic=topic, examples=examples, difficulty=1)
add('category', [
    K('Voće', ['Jabuka', 'Kruška', 'Banana', 'Naranča', 'Mandarina', 'Limun', 'Grožđe', 'Jagoda', 'Trešnja', 'Višnja', 'Šljiva', 'Breskva', 'Marelica', 'Kivi', 'Ananas', 'Mango', 'Lubenica', 'Dinja', 'Smokva', 'Nar', 'Malina', 'Kupina', 'Borovnica', 'Grejp', 'Dunja']),
    K('Povrće', ['Mrkva', 'Krumpir', 'Luk', 'Češnjak', 'Kupus', 'Kelj', 'Brokula', 'Cvjetača', 'Paprika', 'Rajčica', 'Krastavac', 'Tikvica', 'Patlidžan', 'Grah', 'Grašak', 'Špinat', 'Blitva', 'Cikla', 'Rotkvica', 'Celer', 'Poriluk', 'Kukuruz', 'Salata', 'Bundeva']),
    K('Hrvatski gradovi', ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik', 'Bjelovar', 'Vinkovci', 'Koprivnica', 'Čakovec', 'Vukovar', 'Požega', 'Gospić', 'Makarska', 'Trogir', 'Rovinj', 'Poreč', 'Samobor', 'Velika Gorica']),
    K('Sportovi', ['Nogomet', 'Košarka', 'Rukomet', 'Odbojka', 'Tenis', 'Vaterpolo', 'Plivanje', 'Atletika', 'Skijanje', 'Biciklizam', 'Boks', 'Judo', 'Veslanje', 'Jedrenje', 'Golf', 'Hokej', 'Gimnastika', 'Streljaštvo', 'Taekwondo', 'Karate', 'Stolni tenis', 'Badminton', 'Ragbi']),
    K('Zanimanja', ['Liječnik', 'Učitelj', 'Kuhar', 'Konobar', 'Vozač', 'Policajac', 'Vatrogasac', 'Programer', 'Odvjetnik', 'Frizer', 'Zidar', 'Električar', 'Vodoinstalater', 'Pilot', 'Medicinska sestra', 'Arhitekt', 'Novinar', 'Pekar', 'Mesar', 'Ribar', 'Poljoprivrednik', 'Zubar', 'Ljekarnik']),
    K('Životinje u Africi', ['Lav', 'Slon', 'Žirafa', 'Zebra', 'Nosorog', 'Vodenkonj', 'Gepard', 'Leopard', 'Hijena', 'Krokodil', 'Gorila', 'Čimpanza', 'Antilopa', 'Gnu', 'Noj', 'Flamingo', 'Bivol', 'Majmun', 'Lemur']),
    K('Države Južne Amerike', ['Brazil', 'Argentina', 'Čile', 'Peru', 'Kolumbija', 'Venezuela', 'Ekvador', 'Bolivija', 'Paragvaj', 'Urugvaj', 'Gvajana', 'Surinam']),
    K('Boje', ['Crvena', 'Plava', 'Žuta', 'Zelena', 'Crna', 'Bijela', 'Narančasta', 'Ljubičasta', 'Roza', 'Smeđa', 'Siva', 'Tirkizna', 'Bež', 'Bordo', 'Zlatna', 'Srebrna', 'Maslinasta', 'Lila']),
    K('Začini i bilje', ['Papar', 'Sol', 'Ružmarin', 'Origano', 'Bosiljak', 'Peršin', 'Kadulja', 'Lovor', 'Cimet', 'Klinčić', 'Muškatni oraščić', 'Paprika', 'Kurkuma', 'Kumin', 'Timijan', 'Vlasac', 'Kopar', 'Đumbir', 'Mažuran', 'Metvica']),
    K('Kućanski aparati', ['Hladnjak', 'Štednjak', 'Pećnica', 'Perilica rublja', 'Perilica posuđa', 'Mikrovalna', 'Usisavač', 'Glačalo', 'Fen', 'Toster', 'Kuhalo za vodu', 'Aparat za kavu', 'Mikser', 'Blender', 'Sušilica', 'Klima', 'Bojler', 'Zamrzivač']),
    K('Ptice', ['Vrabac', 'Golub', 'Lastavica', 'Orao', 'Sova', 'Roda', 'Galeb', 'Kos', 'Papiga', 'Kokoš', 'Patka', 'Guska', 'Labud', 'Djetlić', 'Svraka', 'Vrana', 'Sokol', 'Jastreb', 'Čaplja', 'Pingvin', 'Noj', 'Paun', 'Purica', 'Slavuj']),
    K('Disneyjevi i Pixarovi crtani filmovi', ['Kralj lavova', 'Aladin', 'Mala sirena', 'Ljepotica i zvijer', 'Snježno kraljevstvo', 'Priča o igračkama', 'Potraga za Nemom', 'Auti', 'Nebesa', 'Izvrnuto obrnuto', 'Coco', 'Zootropolis', 'Moana', 'Ratatouille', 'Čudovišta iz ormara', 'Mulan', 'Pocahontas', 'Tarzan', 'Bambi', 'Dumbo']),
    K('Europske rijeke', ['Dunav', 'Rajna', 'Volga', 'Sava', 'Drava', 'Elba', 'Odra', 'Visla', 'Loira', 'Seina', 'Temza', 'Pad', 'Tibar', 'Ebro', 'Tajo', 'Dnjepar', 'Rona', 'Mosel', 'Neretva', 'Kupa']),
    K('Jela od tijesta', ['Pizza', 'Špageti', 'Lazanje', 'Njoki', 'Burek', 'Štrukli', 'Pita', 'Kroasan', 'Palačinke', 'Krafne', 'Pašticada s njocima', 'Ravioli', 'Tortelini', 'Fuži', 'Mlinci', 'Knedle', 'Pogača', 'Kruh', 'Pereci']),
    K('Društvene igre i igre s kartama', ['Šah', 'Monopoly', 'Čovječe ne ljuti se', 'Scrabble', 'Uno', 'Belot', 'Briškula', 'Trešeta', 'Poker', 'Remi', 'Dama', 'Tabla', 'Domino', 'Activity', 'Catan', 'Riziko', 'Cluedo', 'Jamb']),
    K('Stvari na plaži', ['Ručnik', 'Suncobran', 'Krema za sunčanje', 'Japanke', 'Kupaći kostim', 'Naočale za sunce', 'Lopta', 'Madrac', 'Maska za ronjenje', 'Šešir', 'Hladnjak', 'Ležaljka', 'Knjiga', 'Kanta i lopatica', 'Peraje']),
])

all_q = kept + new
pack = {
    'format': 'zicer-paket',
    'version': 1,
    'pack': {'id': 'zicer-kurirani', 'name': 'Zicer – kurirani paket', 'author': 'Zicer',
             'description': 'Pregledana i očišćena pitanja iz velikih paketa + nova zabavna pitanja.'},
    'questions': all_q,
}
json.dump(pack, open(OUT, 'w'), ensure_ascii=False, indent=1)
import collections
print('zadržano starih:', len(kept), '· novih:', len(new), '· ukupno:', len(all_q))
print(collections.Counter(q['type'] for q in all_q))
