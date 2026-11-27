# Tko je stariji? / Što je bilo prije? – nove osobe i događaji (četvrti paket).
import random, datetime, itertools

PEOPLE = {
 'Glazba': """Ariana Grande 1993-06-26|Katy Perry 1984-10-25|Miley Cyrus 1992-11-23|Selena Gomez 1992-07-22|Harry Styles 1994-02-01|The Weeknd 1990-02-16|Drake 1986-10-24|Kanye West 1977-06-08|Jay-Z 1969-12-04|Snoop Dogg 1971-10-20|Pink 1979-09-08|Avril Lavigne 1984-09-27|Justin Timberlake 1981-01-31|Nicki Minaj 1982-12-08|Sia 1975-12-18|Alicia Keys 1981-01-25|Usher 1978-10-14|Bruno Mars 1985-10-08|Ozzy Osbourne 1948-12-03|Keith Richards 1943-12-18|Ringo Starr 1940-07-07|George Harrison 1943-02-25|John Lennon 1940-10-09|Phil Collins 1951-01-30|Stevie Wonder 1950-05-13|Lionel Richie 1949-06-20|Dolly Parton 1946-01-19|Mišo Kovač 1941-07-16|Tereza Kesovija 1938-10-03|Arsen Dedić 1938-07-28|Zdravko Čolić 1951-05-30|Dino Merlin 1962-09-12|Goran Bregović 1950-03-22""",
 'Film i TV': """Jim Carrey 1962-01-17|Robin Williams 1951-07-21|Eddie Murphy 1961-04-03|Mel Gibson 1956-01-03|Kevin Costner 1955-01-18|Hugh Grant 1960-09-09|Colin Firth 1960-09-10|Daniel Craig 1968-03-02|Pierce Brosnan 1953-05-16|Sean Connery 1930-08-25|Roger Moore 1927-10-14|Clint Eastwood 1930-05-31|Dustin Hoffman 1937-08-08|Anthony Hopkins 1937-12-31|Michael Caine 1933-03-14|Sophia Loren 1934-09-20|Brigitte Bardot 1934-09-28|Elizabeth Taylor 1932-02-27|Grace Kelly 1929-11-12|Kate Winslet 1975-10-05|Cate Blanchett 1969-05-14|Halle Berry 1966-08-14|Reese Witherspoon 1976-03-22|Charlize Theron 1975-08-07|Anne Hathaway 1982-11-12|Emma Stone 1988-11-06|Chris Hemsworth 1983-08-11|Chris Evans 1981-06-13|Robert Downey Jr. 1965-04-04|Ryan Reynolds 1976-10-23|Dwayne Johnson 1972-05-02|Vin Diesel 1967-07-18|Jackie Chan 1954-04-07|Bruce Lee 1940-11-27|Rowan Atkinson 1955-01-06""",
 'Sport': """Ronaldinho 1980-03-21|Zinedine Zidane 1972-06-23|Thierry Henry 1977-08-17|Kaká 1982-04-22|Mohamed Salah 1992-06-15|Robert Lewandowski 1988-08-21|Andrés Iniesta 1984-05-11|Xavi 1980-01-25|Sergio Ramos 1986-03-30|Gianluigi Buffon 1978-01-28|Andy Murray 1987-05-15|Maria Šarapova 1987-04-19|Steffi Graf 1969-06-14|Pete Sampras 1971-08-12|Andre Agassi 1970-04-29|Kobe Bryant 1978-08-23|Shaquille O'Neal 1972-03-06|Wayne Gretzky 1961-01-26|Mike Tyson 1966-06-30|Sebastian Vettel 1987-07-03|Fernando Alonso 1981-07-29|Max Verstappen 1997-09-30|Carlos Alcaraz 2003-05-05|Jannik Sinner 2001-08-16|Ivan Perišić 1989-02-02|Joško Gvardiol 2002-01-23|Dejan Lovren 1989-07-05|Mateo Kovačić 1994-05-06|Danijel Subašić 1984-10-27|Slaven Bilić 1968-09-11|Zvonimir Boban 1968-10-08|Robert Prosinečki 1969-01-12|Dino Rađa 1967-04-24|Iva Majoli 1977-08-12|Ivano Balić 1979-04-01""",
 'Povijest i znanost': """Karl Marx 1818-05-05|Otto von Bismarck 1815-04-01|Kraljica Viktorija 1819-05-24|Florence Nightingale 1820-05-12|Louis Pasteur 1822-12-27|Alfred Nobel 1833-10-21|Mark Twain 1835-11-30|Petar Iljič Čajkovski 1840-05-07|Claude Monet 1840-11-14|Sigmund Freud 1856-05-06|Vladimir Lenjin 1870-04-22|Josif Staljin 1878-12-18|Adolf Hitler 1889-04-20|Benito Mussolini 1883-07-29|Franklin D. Roosevelt 1882-01-30|Charles de Gaulle 1890-11-22|Mao Zedong 1893-12-26|Ernest Hemingway 1899-07-21|Alfred Hitchcock 1899-08-13|Fidel Castro 1926-08-13|Che Guevara 1928-06-14|Papa Ivan Pavao II. 1920-05-18|Margaret Thatcher 1925-10-13|Mihail Gorbačov 1931-03-02|Stephen Hawking 1942-01-08|Neil Armstrong 1930-08-05|Jurij Gagarin 1934-03-09|Franjo Tuđman 1922-05-14|Stjepan Mesić 1934-12-24|Kolinda Grabar-Kitarović 1968-04-29|Zoran Milanović 1966-10-30|Andrej Plenković 1970-04-08""",
}

EVENTS = {
 'Tehnologija': """Prva fotografija 1826|Telefon (Bell) 1876|Automobil (Benz) 1886|Prva filmska projekcija (Lumière) 1895|Let braće Wright 1903|Ford Model T 1908|Televizija (Baird) 1927|Penicilin 1928|ENIAC, prvo elektroničko računalo 1945|Tranzistor 1947|Laser 1960|Prvi poziv mobitelom 1973|IBM PC 1981|CD 1982|DVD 1996|Google 1998|iPod 2001|Skype 2003|Facebook 2004|iPhone 2007|Instagram 2010|ChatGPT 2022""",
 'Povijest': """Pad Zapadnog Rimskog Carstva 476|Krunidba Karla Velikog 800|Magna Carta 1215|Crna smrt u Europi 1347|Pad Carigrada 1453|Kolumbo u Americi 1492|Lutherove teze 1517|Bitka kod Sigeta 1566|Brod Mayflower 1620|Veliki požar Londona 1666|Bitka kod Beča 1683|Američka neovisnost 1776|Francuska revolucija 1789|Bitka kod Waterlooa 1815|Ukidanje kmetstva u Hrvatskoj 1848|Ujedinjenje Italije 1861|Ujedinjenje Njemačke 1871|Potonuće Titanica 1912|Oktobarska revolucija 1917|Velika gospodarska kriza 1929|Kraj Drugog svjetskog rata 1945|Osnivanje Izraela 1948|Kubanska raketna kriza 1962|Slijetanje na Mjesec 1969|Pad Berlinskog zida 1989|Raspad Sovjetskog Saveza 1991|Euro u novčanicama 2002""",
 'Hrana i igre': """Coca-Cola 1886|Kraš (tvornica Union) 1911|Monopoly 1935|Prvi McDonald's restoran 1940|Podravka 1947|Lego kocka 1958|Vegeta 1959|Barbie 1959|Nutella 1964|Cedevita 1969|Kinder jaje 1974|Rubikova kocka 1974|Pac-Man 1980|Tetris 1984|Red Bull 1987|Game Boy 1989|PlayStation 1994|Pokémon 1996|Minecraft 2011|Fortnite 2017""",
}

rnd = random.Random(20261129)
MONTHS = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca']

def parse(block, dated):
    out = []
    for item in block.split('|'):
        n, d = item.strip().rsplit(' ', 1)
        out.append((n, datetime.date.fromisoformat(d) if dated else int(d)))
    return out

fmt_date = lambda d: f'{d.day}. {MONTHS[d.month - 1]} {d.year}.'
VERSUS = []

def make(prompt, items, dated, category, nq):
    used = set()
    for _ in range(nq):
        for _try in range(300):
            sample = rnd.sample(items, min(10, len(items)))
            pairs, names = [], set()
            for a, b in itertools.combinations(sample, 2):
                if a[0] in names or b[0] in names: continue
                diff = abs((a[1] - b[1]).days) / 365.25 if dated else abs(a[1] - b[1])
                if diff < (0.5 if dated else 2) or diff > (25 if dated else 60): continue
                if frozenset((a[0], b[0])) in used: continue
                pairs.append((a, b, diff)); names |= {a[0], b[0]}
                if len(pairs) == 5: break
            if len(pairs) == 5: break
        else:
            continue
        out = []
        for a, b, _ in pairs:
            used.add(frozenset((a[0], b[0])))
            if rnd.random() < 0.5: a, b = b, a
            val = fmt_date if dated else (lambda x: f'{x}.')
            out.append({'a': a[0], 'b': b[0], 'correct': 0 if a[1] < b[1] else 1, 'values': [val(a[1]), val(b[1])]})
        avg = sum(p[2] for p in pairs) / 5
        VERSUS.append((prompt, out, category, 3 if avg < 4 else 2 if avg < 9 else 1))

for cat, block in PEOPLE.items():
    make('Tko je stariji?', parse(block, True), True, cat, 30)
for cat, block in EVENTS.items():
    make('Što je bilo prije?', parse(block, False), False, cat, 18)
