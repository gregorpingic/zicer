# Oscari, Olimpijske igre, Svjetska prvenstva, Eurosong – pitanja iz provjerenih popisa.
import random
rnd = random.Random(55)
QUIZ = []

def gen(rows, qfmt, cat, efmt, src, d, near=None):
    vals = [v for _, v in rows]
    for i, (k, v) in enumerate(rows):
        pool = [x for j, x in enumerate(vals) if x != v and (near is None or abs(j - i) <= near)]
        pool = list(dict.fromkeys(pool))
        if len(pool) < 3:
            pool = list(dict.fromkeys(x for x in vals if x != v))
        QUIZ.append((qfmt(k), [v] + rnd.sample(pool, 3), cat, efmt(k, v), src, d))

OSCAR = """1973|Kum;1975|Kum II;1976|Let iznad kukavičjeg gnijezda;1977|Rocky;1978|Annie Hall;1983|Gandhi;1985|Amadeus;1988|Posljednji car;1989|Kišni čovjek;1991|Ples s vukovima;1992|Kad jaganjci utihnu;1993|Nepomirljivi;1994|Schindlerova lista;1995|Forrest Gump;1996|Hrabro srce;1997|Engleski pacijent;1998|Titanic;1999|Zaljubljeni Shakespeare;2000|Vrijeme odluke (American Beauty);2001|Gladijator;2002|Genijalni um;2003|Chicago;2004|Gospodar prstenova: Povratak kralja;2005|Djevojka od milijun dolara;2006|Fatalna nesreća;2007|Pokojni;2008|Nema zemlje za starce;2009|Milijunaš s ulice;2010|Katanac boli;2011|Kraljev govor;2012|Umjetnik;2013|Argo;2014|12 godina ropstva;2015|Birdman;2016|Spotlight;2017|Moonlight;2018|Obličje vode;2019|Zelena knjiga;2020|Parazit;2021|Nomadland;2022|CODA;2023|Sve u isto vrijeme;2024|Oppenheimer;2025|Anora"""
rows = [tuple(x.split('|')) for x in OSCAR.split(';')]
gen(rows, lambda y: f'Koji je film na dodjeli Oscara {y}. proglašen najboljim filmom?', 'Filmovi i serije',
    lambda y, f: f'Na dodjeli {y}. najbolji film bio je „{f}”.', 'Akademija filmskih umjetnosti i znanosti', 3, near=6)

SUMMER = """1896|Atena;1900|Pariz;1904|St. Louis;1908|London;1912|Stockholm;1920|Antwerpen;1928|Amsterdam;1932|Los Angeles;1936|Berlin;1952|Helsinki;1956|Melbourne;1960|Rim;1964|Tokio;1968|Mexico City;1972|München;1976|Montreal;1980|Moskva;1988|Seul;1992|Barcelona;1996|Atlanta;2000|Sydney;2008|Peking;2016|Rio de Janeiro;2024|Pariz;2032|Brisbane"""
rows = [tuple(x.split('|')) for x in SUMMER.split(';')]
gen(rows, lambda y: f'Koji je grad bio domaćin Ljetnih olimpijskih igara {y}.?' if int(y) < 2026 else f'Koji će grad biti domaćin Ljetnih olimpijskih igara {y}.?', 'Sport',
    lambda y, c: f'Ljetne olimpijske igre {y}. održane su (ili će se održati) u gradu {c}.', 'Međunarodni olimpijski odbor', 2)

WINTER = """1924|Chamonix;1928|St. Moritz;1932|Lake Placid;1936|Garmisch-Partenkirchen;1952|Oslo;1956|Cortina d'Ampezzo;1964|Innsbruck;1968|Grenoble;1972|Sapporo;1984|Sarajevo;1988|Calgary;1992|Albertville;1994|Lillehammer;1998|Nagano;2002|Salt Lake City;2006|Torino;2010|Vancouver;2014|Soči;2018|Pyeongchang;2022|Peking;2026|Milano i Cortina d'Ampezzo"""
rows = [tuple(x.split('|')) for x in WINTER.split(';')]
gen(rows, lambda y: f'Gdje su održane Zimske olimpijske igre {y}.?', 'Sport',
    lambda y, c: f'Zimske olimpijske igre {y}. održane su u: {c}.', 'Međunarodni olimpijski odbor', 3)

WCH = """1930|Urugvaj;1934|Italija;1938|Francuska;1950|Brazil;1954|Švicarska;1958|Švedska;1962|Čile;1966|Engleska;1970|Meksiko;1974|Zapadna Njemačka;1978|Argentina;1982|Španjolska;1990|Italija;1994|SAD;1998|Francuska;2002|Južna Koreja i Japan;2006|Njemačka;2010|Južnoafrička Republika;2014|Brazil;2018|Rusija;2022|Katar;2026|SAD, Kanada i Meksiko"""
rows = [tuple(x.split('|')) for x in WCH.split(';')]
gen(rows, lambda y: f'Koja je zemlja bila domaćin Svjetskog prvenstva u nogometu {y}.?', 'Sport',
    lambda y, c: f'Svjetsko prvenstvo {y}. održano je u: {c}.', 'FIFA', 2)

WCW = """1930|Urugvaj;1934|Italija;1950|Urugvaj;1954|Zapadna Njemačka;1958|Brazil;1966|Engleska;1970|Brazil;1978|Argentina;1982|Italija;1986|Argentina;1990|Zapadna Njemačka;1994|Brazil;1998|Francuska;2002|Brazil;2006|Italija;2010|Španjolska;2014|Njemačka;2018|Francuska;2022|Argentina"""
rows = [tuple(x.split('|')) for x in WCW.split(';')]
gen(rows, lambda y: f'Koja je reprezentacija osvojila Svjetsko prvenstvo u nogometu {y}.?', 'Sport',
    lambda y, c: f'Svjetski prvak {y}. bila je reprezentacija: {c}.', 'FIFA', 2)

EURO = """2000|Danska;2001|Estonija;2002|Latvija;2003|Turska;2004|Ukrajina;2005|Grčka;2006|Finska;2007|Srbija;2008|Rusija;2009|Norveška;2010|Njemačka;2011|Azerbajdžan;2012|Švedska;2013|Danska;2014|Austrija;2016|Ukrajina;2017|Portugal;2018|Izrael;2019|Nizozemska;2021|Italija;2023|Švedska;2024|Švicarska;2025|Austrija"""
rows = [tuple(x.split('|')) for x in EURO.split(';')]
gen(rows, lambda y: f'Koja je država pobijedila na Eurosongu {y}.?', 'Glazba',
    lambda y, c: f'Na Eurosongu {y}. pobijedila je: {c}.', 'EBU – Eurovision Song Contest', 3)
