# Paket „Tko je stariji?” – brze serije od 5 usporedbi (datumi rođenja i godine događaja).
import json, random, datetime, itertools, os
random.seed(20261127)

PEOPLE = {
 'Glazba': """Madonna 1958-08-16|Michael Jackson 1958-08-29|Prince 1958-06-07|Jon Bon Jovi 1962-03-02|Bruce Springsteen 1949-09-23|Mick Jagger 1943-07-26|Paul McCartney 1942-06-18|Elton John 1947-03-25|Freddie Mercury 1946-09-05|David Bowie 1947-01-08|Bob Dylan 1941-05-24|Cher 1946-05-20|Tina Turner 1939-11-26|Whitney Houston 1963-08-09|Beyoncé 1981-09-04|Britney Spears 1981-12-02|Christina Aguilera 1980-12-18|Jennifer Lopez 1969-07-24|Shakira 1977-02-02|Rihanna 1988-02-20|Taylor Swift 1989-12-13|Adele 1988-05-05|Lady Gaga 1986-03-28|Ed Sheeran 1991-02-17|Justin Bieber 1994-03-01|Eminem 1972-10-17|Robbie Williams 1974-02-13|Bono 1960-05-10|Sting 1951-10-02|Celine Dion 1968-03-30|Kylie Minogue 1968-05-28|George Michael 1963-06-25|Kurt Cobain 1967-02-20|Billie Eilish 2001-12-18|Dua Lipa 1995-08-22|Elvis Presley 1935-01-08|Oliver Dragojević 1947-12-07|Severina 1972-04-21|Doris Dragović 1961-04-16|Gibonni 1968-08-13|Đorđe Balašević 1953-05-11""",
 'Film i TV': """Tom Cruise 1962-07-03|Brad Pitt 1963-12-18|Johnny Depp 1963-06-09|Leonardo DiCaprio 1974-11-11|Tom Hanks 1956-07-09|Julia Roberts 1967-10-28|Jennifer Aniston 1969-02-11|George Clooney 1961-05-06|Angelina Jolie 1975-06-04|Keanu Reeves 1964-09-02|Nicole Kidman 1967-06-20|Meryl Streep 1949-06-22|Robert De Niro 1943-08-17|Al Pacino 1940-04-25|Jack Nicholson 1937-04-22|Morgan Freeman 1937-06-01|Harrison Ford 1942-07-13|Arnold Schwarzenegger 1947-07-30|Sylvester Stallone 1946-07-06|Bruce Willis 1955-03-19|Denzel Washington 1954-12-28|Will Smith 1968-09-25|Sandra Bullock 1964-07-26|Cameron Diaz 1972-08-30|Matt Damon 1970-10-08|Ben Affleck 1972-08-15|Scarlett Johansson 1984-11-22|Emma Watson 1990-04-15|Daniel Radcliffe 1989-07-23|Jennifer Lawrence 1990-08-15|Margot Robbie 1990-07-02|Ryan Gosling 1980-11-12|Keira Knightley 1985-03-26|Natalie Portman 1981-06-09|Zendaya 1996-09-01|Tom Holland 1996-06-01|Timothée Chalamet 1995-12-27|Goran Višnjić 1972-09-09|Rade Šerbedžija 1946-07-27|Marilyn Monroe 1926-06-01|Audrey Hepburn 1929-05-04|Charlie Chaplin 1889-04-16|Oprah Winfrey 1954-01-29|Kim Kardashian 1980-10-21""",
 'Sport': """Lionel Messi 1987-06-24|Cristiano Ronaldo 1985-02-05|Novak Đoković 1987-05-22|Rafael Nadal 1986-06-03|Roger Federer 1981-08-08|Serena Williams 1981-09-26|Michael Jordan 1963-02-17|LeBron James 1984-12-30|Usain Bolt 1986-08-21|Michael Phelps 1985-06-30|Zlatan Ibrahimović 1981-10-03|Neymar 1992-02-05|Kylian Mbappé 1998-12-20|Erling Haaland 2000-07-21|Diego Maradona 1960-10-30|Pelé 1940-10-23|David Beckham 1975-05-02|Tiger Woods 1975-12-30|Muhammad Ali 1942-01-17|Lewis Hamilton 1985-01-07|Michael Schumacher 1969-01-03|Luka Modrić 1985-09-09|Davor Šuker 1968-01-01|Goran Ivanišević 1971-09-13|Janica Kostelić 1982-01-05|Ivica Kostelić 1979-11-23|Blanka Vlašić 1983-11-08|Dražen Petrović 1964-10-22|Toni Kukoč 1968-09-18|Mario Mandžukić 1986-05-21|Ivan Rakitić 1988-03-10|Marin Čilić 1988-09-28|Sandra Perković 1990-06-21|Zlatko Dalić 1966-10-26""",
 'Povijest i znanost': """Napoleon Bonaparte 1769-08-15|Wolfgang Amadeus Mozart 1756-01-27|Leonardo da Vinci 1452-04-15|Michelangelo 1475-03-06|Galileo Galilei 1564-02-15|Isaac Newton 1643-01-04|Albert Einstein 1879-03-14|Charles Darwin 1809-02-12|Marie Curie 1867-11-07|Thomas Edison 1847-02-11|Nikola Tesla 1856-07-10|Vincent van Gogh 1853-03-30|Pablo Picasso 1881-10-25|Kraljica Elizabeta II. 1926-04-21|Winston Churchill 1874-11-30|Mahatma Gandhi 1869-10-02|Martin Luther King 1929-01-15|John F. Kennedy 1917-05-29|Frida Kahlo 1907-07-06|Salvador Dalí 1904-05-11|Steve Jobs 1955-02-24|Bill Gates 1955-10-28|Elon Musk 1971-06-28|Mark Zuckerberg 1984-05-14|Jeff Bezos 1964-01-12|Barack Obama 1961-08-04|Donald Trump 1946-06-14|Joe Biden 1942-11-20|Vladimir Putin 1952-10-07|Papa Franjo 1936-12-17|Kralj Charles III. 1948-11-14|Princeza Diana 1961-07-01|Princ William 1982-06-21|Princ Harry 1984-09-15|Ruđer Bošković 1711-05-18|Miroslav Krleža 1893-07-07|Marija Jurić Zagorka 1873-03-02|Ivan Meštrović 1883-08-15|Josip Broz Tito 1892-05-07|Ivo Andrić 1892-10-09|Charles Dickens 1812-02-07|Jules Verne 1828-02-08|Lav Tolstoj 1828-09-09|Agatha Christie 1890-09-15|J. K. Rowling 1965-07-31|Walt Disney 1901-12-05|Mate Rimac 1988-02-12""",
}

EVENTS = {
 'Tehnologija i internet': """Prvi iPhone 2007|Facebook 2004|YouTube 2005|Google 1998|Wikipedija 2001|Instagram 2010|WhatsApp 2009|Twitter 2006|Netflix (osnivanje) 1997|Amazon (osnivanje) 1994|Prvi PlayStation 1994|Game Boy 1989|Windows 95 1995|Prvi SMS 1992|ChatGPT 2022|Bitcoin 2009|Nintendo Wii 2006|Prvi let braće Wright 1903|Izum telefona (Bellov patent) 1876|Sputnjik 1957|Let Jurija Gagarina 1961|Slijetanje na Mjesec 1969|Otkriće penicilina 1928""",
 'Filmovi i serije': """Prvi film o Harryju Potteru 2001|Titanic (film) 1997|Jurski park 1993|Ratovi zvijezda (prvi film) 1977|Kum 1972|Matrix 1999|Avatar 2009|Kralj lavova 1994|Shrek 2001|Snježno kraljevstvo 2013|Prijatelji (prva epizoda) 1994|Simpsoni (prva epizoda) 1989|Igra prijestolja (prva epizoda) 2011|Breaking Bad (prva epizoda) 2008|Parobrod Willie – prvi Mickey Mouse 1928|Gospodar prstenova: Prstenova družina 2001|Povratak u budućnost 1985|E.T. 1982|Čeljusti 1975|Forrest Gump 1994|Pulp Fiction 1994|Avengers (prvi film) 2012|Barbie (film) 2023|Squid Game 2021""",
 'Povijest': """Kolumbo stiže u Ameriku 1492|Francuska revolucija 1789|Američka deklaracija o neovisnosti 1776|Eiffelov toranj dovršen 1889|Kip slobode 1886|Titanic potonuo 1912|Početak Prvog svjetskog rata 1914|Kraj Drugog svjetskog rata 1945|Pad Berlinskog zida 1989|Černobilska nesreća 1986|Hrvatska proglašava neovisnost 1991|Hrvatska ulazi u EU 2013|Hrvatska uvodi euro 2023|Euro novčanice i kovanice u opticaju 2002|Akcija Oluja 1995|Olimpijske igre u Sarajevu 1984|Hrvatska bronca na SP-u u Francuskoj 1998|Hrvatska srebrna na SP-u u Rusiji 2018|Jugoslavija pobjeđuje na Eurosongu (Riva) 1989|Otkriće krapinskog pračovjeka 1899|Raspad Beatlesa 1970|Pandemija koronavirusa počinje 2020""",
 'Igre i igračke': """Lego kocka 1958|Barbie lutka 1959|Rubikova kocka 1974|Tetris 1984|Super Mario Bros. 1985|Pokémon (prve igre) 1996|Fortnite 2017|Nutella 1964|Coca-Cola 1886|Monopoly (Parker Brothers) 1935|Pac-Man 1980|The Sims 2000|Grand Theft Auto (prva igra) 1997|Angry Birds 2009|Pokémon GO 2016|Tamagotchi 1996""",
}

MONTHS = ['siječnja','veljače','ožujka','travnja','svibnja','lipnja','srpnja','kolovoza','rujna','listopada','studenoga','prosinca']
def parse(block, dated):
    out = []
    for item in block.split('|'):
        n, d = item.strip().rsplit(' ', 1)
        out.append((n, datetime.date.fromisoformat(d) if dated else int(d)))
    return out
fmt_date = lambda d: f'{d.day}. {MONTHS[d.month-1]} {d.year}.'

questions = []
def make(prefix, idx, prompt, items, dated, category, nq):
    used = set()
    for k in range(nq):
        for _ in range(200):
            sample = random.sample(items, 10)
            pairs = []
            names = set()
            for a, b in itertools.combinations(sample, 2):
                if a[0] in names or b[0] in names: continue
                diff = abs((a[1] - b[1]).days) / 365.25 if dated else abs(a[1] - b[1])
                if diff < (0.5 if dated else 2) or diff > (25 if dated else 40): continue
                key = frozenset((a[0], b[0]))
                if key in used: continue
                pairs.append((a, b, diff)); names |= {a[0], b[0]}
                if len(pairs) == 5: break
            if len(pairs) == 5: break
        else:
            continue
        out = []
        for a, b, _ in pairs:
            used.add(frozenset((a[0], b[0])))
            if random.random() < 0.5: a, b = b, a
            correct = 0 if a[1] < b[1] else 1
            val = (lambda x: fmt_date(x)) if dated else (lambda x: f'{x}.')
            out.append({'a': a[0], 'b': b[0], 'correct': correct, 'values': [val(a[1]), val(b[1])]})
        avg = sum(p[2] for p in pairs) / 5
        questions.append({'id': f'usp-{prefix}-{idx+k+1:03d}', 'type': 'versus', 'difficulty': 3 if avg < 4 else 2 if avg < 9 else 1,
                          'category': category, 'prompt': prompt, 'pairs': out})

for i, (cat, block) in enumerate(PEOPLE.items()):
    make(f'osobe{i}', 0, 'Tko je stariji?', parse(block, True), True, cat, 14)
for i, (cat, block) in enumerate(EVENTS.items()):
    make(f'dog{i}', 0, 'Što je bilo prije?', parse(block, False), False, cat, 10 if len(block.split('|')) > 18 else 6)

pack = {'format': 'zicer-paket', 'version': 1,
        'pack': {'id': 'zicer-usporedbe', 'name': 'Tko je stariji? – usporedbe', 'author': 'Zicer', 'description': 'Brze serije usporedbi: datumi rođenja poznatih osoba i godine događaja.'},
        'questions': questions}
root = os.path.join(os.path.dirname(__file__), '..', 'paketi')
os.makedirs(root, exist_ok=True)
json.dump(pack, open(os.path.join(root, 'zicer-usporedbe.json'), 'w'), ensure_ascii=False, indent=1)
print(len(questions), 'pitanja')
