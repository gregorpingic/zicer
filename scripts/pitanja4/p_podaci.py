# Pitanja generirana iz provjerenih tablica: gradovi, valute, županije, filmovi, kemijski elementi.
import random
rnd = random.Random(20261130)
QUIZ, YEAR, ORDER, HL = [], [], [], []

def quiz_from(pairs, qfmt, cat, expl_fmt, src, d=2, pool=None):
    """pairs: [(ključ, točan_odgovor, grupa)] – netočni odgovori iz iste grupe."""
    for key, ans, grp in pairs:
        cand = sorted({a for k, a, g in (pool or pairs) if g == grp and a != ans})
        if len(cand) < 3:
            cand = sorted({a for k, a, g in (pool or pairs) if a != ans})
        QUIZ.append((qfmt(key), [ans] + rnd.sample(cand, 3), cat, expl_fmt(key, ans), src, d))

# ---------- gradovi ----------
CITIES = """München|Njemačka|EU;Hamburg|Njemačka|EU;Köln|Njemačka|EU;Frankfurt|Njemačka|EU;Milano|Italija|EU;Napulj|Italija|EU;Firenca|Italija|EU;Venecija|Italija|EU;Torino|Italija|EU;Bologna|Italija|EU;Barcelona|Španjolska|EU;Sevilla|Španjolska|EU;Valencija|Španjolska|EU;Bilbao|Španjolska|EU;Málaga|Španjolska|EU;Porto|Portugal|EU;Lyon|Francuska|EU;Marseille|Francuska|EU;Nica|Francuska|EU;Bordeaux|Francuska|EU;Strasbourg|Francuska|EU;Manchester|Ujedinjeno Kraljevstvo|EU;Liverpool|Ujedinjeno Kraljevstvo|EU;Edinburgh|Ujedinjeno Kraljevstvo|EU;Glasgow|Ujedinjeno Kraljevstvo|EU;Antwerpen|Belgija|EU;Brugge|Belgija|EU;Rotterdam|Nizozemska|EU;Zürich|Švicarska|EU;Ženeva|Švicarska|EU;Salzburg|Austrija|EU;Graz|Austrija|EU;Innsbruck|Austrija|EU;Krakov|Poljska|EU;Gdanjsk|Poljska|EU;Brno|Češka|EU;Göteborg|Švedska|EU;Bergen|Norveška|EU;Solun|Grčka|EU;Sankt Peterburg|Rusija|EU;Debrecen|Mađarska|EU;Maribor|Slovenija|EU;Novi Sad|Srbija|EU;Mostar|Bosna i Hercegovina|EU;Kotor|Crna Gora|EU;Ohrid|Sjeverna Makedonija|EU;New York|SAD|AM;Los Angeles|SAD|AM;Chicago|SAD|AM;Las Vegas|SAD|AM;Toronto|Kanada|AM;Vancouver|Kanada|AM;Montreal|Kanada|AM;Rio de Janeiro|Brazil|AM;São Paulo|Brazil|AM;Cancún|Meksiko|AM;Sydney|Australija|AM;Melbourne|Australija|AM;Auckland|Novi Zeland|AM;Šangaj|Kina|AZ;Hong Kong|Kina|AZ;Mumbai|Indija|AZ;Osaka|Japan|AZ;Kyoto|Japan|AZ;Dubai|Ujedinjeni Arapski Emirati|AZ;Istanbul|Turska|AZ;Marakeš|Maroko|AF;Casablanca|Maroko|AF;Cape Town|Južnoafrička Republika|AF;Aleksandrija|Egipat|AF;Zanzibar|Tanzanija|AF"""
cities = [tuple(x.split('|')) for x in CITIES.split(';')]
quiz_from(cities, lambda c: f'U kojoj se državi nalazi grad {c}?', 'Geografija', lambda c, a: f'{c} se nalazi u državi: {a}.', 'Geografski atlas', 1)

# ---------- valute ----------
CUR = """Švicarska|švicarski franak;Ujedinjeno Kraljevstvo|britanska funta;SAD|američki dolar;Japan|japanski jen;Kina|kineski juan (renminbi);Indija|indijska rupija;Rusija|ruski rubalj;Poljska|poljski zlot;Mađarska|mađarska forinta;Češka|češka kruna;Danska|danska kruna;Švedska|švedska kruna;Norveška|norveška kruna;Turska|turska lira;Srbija|srpski dinar;Bosna i Hercegovina|konvertibilna marka;Rumunjska|rumunjski lej;Brazil|brazilski real;Meksiko|meksički pezo;Južna Koreja|južnokorejski von;Južnoafrička Republika|južnoafrički rand;Izrael|izraelski šekel;Tajland|tajlandski baht;Saudijska Arabija|saudijski rijal;Ujedinjeni Arapski Emirati|emiratski dirham;Australija|australski dolar;Kanada|kanadski dolar;Island|islandska kruna;Hrvatska|euro;Crna Gora|euro"""
cur = [(a, b, 'X') for a, b in (x.split('|') for x in CUR.split(';'))]
for land, c, _ in cur:
    wrong = rnd.sample(sorted({b for a, b, g in cur if b != c}), 3)
    expl = f'{land} koristi valutu: {c}.' + (' Crna Gora koristi euro iako nije članica EU-a.' if land == 'Crna Gora' else '')
    QUIZ.append((f'Koja je službena valuta – {land}?', [c] + wrong, 'Geografija', expl, 'Središnje banke (stanje 2026.)', 2))

# ---------- županije ----------
ZUP = """Zagrebačka|Zagreb;Krapinsko-zagorska|Krapina;Sisačko-moslavačka|Sisak;Karlovačka|Karlovac;Varaždinska|Varaždin;Koprivničko-križevačka|Koprivnica;Bjelovarsko-bilogorska|Bjelovar;Primorsko-goranska|Rijeka;Ličko-senjska|Gospić;Virovitičko-podravska|Virovitica;Požeško-slavonska|Požega;Brodsko-posavska|Slavonski Brod;Zadarska|Zadar;Osječko-baranjska|Osijek;Šibensko-kninska|Šibenik;Vukovarsko-srijemska|Vukovar;Splitsko-dalmatinska|Split;Istarska|Pazin;Dubrovačko-neretvanska|Dubrovnik;Međimurska|Čakovec"""
zup = [tuple(x.split('|')) for x in ZUP.split(';')]
seats = [s for _, s in zup]
for z, s in zup:
    gen = z[:-1] + 'e'
    QUIZ.append((f'Koje je sjedište {gen} županije?', [s] + rnd.sample([x for x in seats if x != s], 3), 'Hrvatska',
                 f'Sjedište {gen} županije je {s}.' + (' Pazin je sjedište iako su Pula i Rovinj veći.' if z == 'Istarska' else ''), 'Zakon o područjima županija', 2 if z != 'Istarska' else 3))
TOWNS = """Samobor|Zagrebačka;Velika Gorica|Zagrebačka;Zaprešić|Zagrebačka;Ogulin|Karlovačka;Petrinja|Sisačko-moslavačka;Kutina|Sisačko-moslavačka;Đakovo|Osječko-baranjska;Našice|Osječko-baranjska;Vinkovci|Vukovarsko-srijemska;Ilok|Vukovarsko-srijemska;Makarska|Splitsko-dalmatinska;Sinj|Splitsko-dalmatinska;Trogir|Splitsko-dalmatinska;Imotski|Splitsko-dalmatinska;Knin|Šibensko-kninska;Metković|Dubrovačko-neretvanska;Korčula|Dubrovačko-neretvanska;Rovinj|Istarska;Poreč|Istarska;Umag|Istarska;Opatija|Primorsko-goranska;Crikvenica|Primorsko-goranska;Krk|Primorsko-goranska;Senj|Ličko-senjska;Otočac|Ličko-senjska;Biograd na Moru|Zadarska;Nin|Zadarska;Križevci|Koprivničko-križevačka;Đurđevac|Koprivničko-križevačka;Daruvar|Bjelovarsko-bilogorska;Slatina|Virovitičko-podravska;Pakrac|Požeško-slavonska;Nova Gradiška|Brodsko-posavska;Ivanec|Varaždinska;Zabok|Krapinsko-zagorska;Prelog|Međimurska"""
zn = [z for z, _ in zup]
for t, z in (x.split('|') for x in TOWNS.split(';')):
    QUIZ.append((f'U kojoj se županiji nalazi {t}?', [z + ' županija'] + [w + ' županija' for w in rnd.sample([x for x in zn if x != z], 3)], 'Hrvatska',
                 f'{t} je u {z[:-1]}oj županiji.', 'Zakon o područjima županija', 3))

# ---------- filmovi po godinama ----------
FILMS = """Prohujalo s vihorom|1939;Casablanca|1942;Psiho|1960;Doručak kod Tiffanyja|1961;Moje pjesme, moji snovi|1965;2001.: Odiseja u svemiru|1968;Kum|1972;Egzorcist|1973;Čeljusti|1975;Rocky|1976;Ratovi zvijezda|1977;Grease|1978;Osmi putnik|1979;Isijavanje|1980;Otimači izgubljenog kovčega|1981;E.T.|1982;Povratak u budućnost|1985;Top Gun|1986;Prljavi ples|1987;Kišni čovjek|1988;Klub mrtvih pjesnika|1989;Sam u kući|1990;Kad jaganjci utihnu|1991;Aladin|1992;Jurski park|1993;Forrest Gump|1994;Priča o igračkama|1995;Dan nezavisnosti|1996;Titanic|1997;Spašavanje vojnika Ryana|1998;Matrix|1999;Gladijator|2000;Shrek|2001;Spider-Man|2002;Potraga za Nemom|2003;Shrek 2|2004;Batman: Početak|2005;Casino Royale|2006;Ratatouille|2007;Vitez tame|2008;Avatar|2009;Početak (Inception)|2010;Osvetnici|2012;Snježno kraljevstvo|2013;Interstellar|2014;Mad Max: Divlja cesta|2015;Zootropolis|2016;Coco|2017;Crni pantera|2018;Joker|2019;Dina|2021;Top Gun: Maverick|2022;Oppenheimer|2023;Izokrenuto 2|2024"""
films = [(n, int(y)) for n, y in (x.split('|') for x in FILMS.split(';'))]
FSRC = 'IMDb / Encyclopaedia Britannica'
for n, y in films:
    YEAR.append((f'Koje je godine izašao film „{n}”?', y, 'Filmovi i serije', f'„{n}” je izašao {y}.', FSRC, 2 if y >= 1975 else 3))
made = set()
while len(ORDER) < 40:
    pick = sorted(rnd.sample(films, 5), key=lambda f: f[1])
    if any(pick[i + 1][1] - pick[i][1] < 3 for i in range(4)): continue
    k = tuple(sorted(p[0] for p in pick))
    if k in made: continue
    made.add(k)
    ORDER.append(('Poredaj filmove po godini izlaska – od najstarijeg.', [p[0] for p in pick], [f'{p[1]}.' for p in pick], 'Filmovi i serije',
                  f'Najstariji je „{pick[0][0]}” iz {pick[0][1]}.', FSRC, 2))
made = set()
while len(HL) < 50:
    a, b = rnd.sample(films, 2)
    if abs(a[1] - b[1]) < 2 or (a[0], b[0]) in made: continue
    made.add((a[0], b[0]))
    HL.append((f'Je li film „{a[0]}” izašao prije ili poslije filma „{b[0]}”?', ['Prije', 'Poslije'], 0 if a[1] < b[1] else 1, 'Filmovi i serije',
               f'„{a[0]}” je iz {a[1]}., a „{b[0]}” iz {b[1]}.', FSRC, 2))

# ---------- kemijski elementi ----------
EL = """H|vodik;He|helij;Li|litij;C|ugljik;N|dušik;O|kisik;F|fluor;Ne|neon;Na|natrij;Mg|magnezij;Al|aluminij;Si|silicij;P|fosfor;S|sumpor;Cl|klor;K|kalij;Ca|kalcij;Fe|željezo;Cu|bakar;Zn|cink;Ag|srebro;Au|zlato;Hg|živa;Pb|olovo;Sn|kositar;Ni|nikal;Co|kobalt;Cr|krom;Mn|mangan;I|jod;U|uran;Pt|platina;Ti|titanij;W|volfram;Br|brom;Ra|radij"""
els = [tuple(x.split('|')) for x in EL.split(';')]
for sym, name in els:
    wrong = rnd.sample([n for s, n in els if n != name], 3)
    QUIZ.append((f'Koji kemijski element ima simbol {sym}?', [name.capitalize()] + [w.capitalize() for w in wrong], 'Znanost',
                 f'{sym} je simbol za {name}.', 'Periodni sustav elemenata (IUPAC)', 2 if len(sym) == 1 or sym in ('Fe', 'Au', 'Ag', 'Na', 'He') else 3))
