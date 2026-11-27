# Poredaj po redu, Koliko me poznaješ?, Nabroji tri – peti paket.
B = 'Encyclopaedia Britannica'
HE = 'Hrvatska enciklopedija'

def L(s):
    return [x.strip() for x in s.split(',') if x.strip()]

# (zadatak, [pojmovi u TOČNOM redu], [vrijednosti], kategorija, objašnjenje, izvor, težina)
ORDER = [
    ('Poredaj faze Mjeseca počevši od mladog Mjeseca.', ['Mlađak', 'Prva četvrt', 'Uštap (pun Mjesec)', 'Zadnja četvrt'], ['', '', '', ''], 'Znanost', 'Cijeli ciklus traje oko 29,5 dana.', B, 2),
    ('Poredaj slova grčkog alfabeta po redu.', ['Alfa', 'Beta', 'Gama', 'Delta', 'Epsilon'], ['', '', '', '', ''], 'Zanimljivosti', 'Odatle i riječ „alfabet”.', B, 1),
    ('Poredaj slova NATO-ove abecede po redu.', ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo'], ['A', 'B', 'C', 'D', 'E'], 'Zanimljivosti', 'Slijede Foxtrot, Golf i Hotel.', 'NATO', 2),
    ('Poredaj rimske brojeve od najmanjeg.', ['V', 'X', 'L', 'C', 'M'], ['5', '10', '50', '100', '1000'], 'Zanimljivosti', 'D je 500.', B, 2),
    ('Poredaj planete od Sunca.', ['Merkur', 'Venera', 'Zemlja', 'Mars', 'Jupiter'], ['', '', '', '', ''], 'Znanost', 'Nakon Jupitera slijede Saturn, Uran i Neptun.', 'NASA', 1),
    ('Poredaj planete od najudaljenijeg prema Suncu.', ['Neptun', 'Uran', 'Saturn', 'Jupiter', 'Mars'], ['', '', '', '', ''], 'Znanost', 'Neptun je najudaljeniji planet.', 'NASA', 2),
    ('Poredaj slojeve Zemlje od površine prema središtu.', ['Kora', 'Plašt', 'Vanjska jezgra', 'Unutarnja jezgra'], ['', '', '', ''], 'Znanost', 'Unutarnja jezgra je čvrsta, a vanjska tekuća.', B, 2),
    ('Poredaj slojeve atmosfere od tla prema gore.', ['Troposfera', 'Stratosfera', 'Mezosfera', 'Termosfera'], ['', '', '', ''], 'Znanost', 'Ozonski omotač je u stratosferi.', 'NASA', 3),
    ('Poredaj faze života leptira.', ['Jaje', 'Gusjenica', 'Kukuljica', 'Leptir'], ['', '', '', ''], 'Životinje', 'Takav razvoj zove se potpuna preobrazba.', 'National Geographic', 1),
    ('Poredaj faze razvoja žabe.', ['Jaje (mrijest)', 'Punoglavac', 'Punoglavac s nogama', 'Žaba'], ['', '', '', ''], 'Životinje', 'Punoglavac diše škrgama.', 'National Geographic', 1),
    ('Poredaj ljudske zube od sredine usta prema kraju.', ['Sjekutići', 'Očnjaci', 'Pretkutnjaci', 'Kutnjaci'], ['', '', '', ''], 'Znanost', 'Umnjaci su posljednji kutnjaci.', B, 3),
    ('Poredaj obroke kroz dan prema uobičajenom vremenu.', ['Doručak', 'Ručak', 'Užina', 'Večera'], ['', '', '', ''], 'Zanimljivosti', 'U Hrvatskoj se užinom često zove i prijepodnevni obrok.', 'Opće znanje', 1),
    ('Poredaj ljetne Olimpijske igre kronološki.', ['Barcelona', 'Atlanta', 'Sydney', 'Atena', 'Peking'], ['1992.', '1996.', '2000.', '2004.', '2008.'], 'Sport', 'London je slijedio 2012.', 'MOO', 2),
    ('Poredaj svjetska nogometna prvenstva kronološki.', ['Italija', 'SAD', 'Francuska', 'Južna Koreja i Japan', 'Njemačka'], ['1990.', '1994.', '1998.', '2002.', '2006.'], 'Sport', 'Hrvatska je prvi put igrala 1998.', 'FIFA', 2),
    ('Poredaj filmove o Jamesu Bondu s Danielom Craigom redom izlaska.', ['Casino Royale', 'Zrno utjehe', 'Skyfall', 'Spectre', 'Ne umiri još'], ['2006.', '2008.', '2012.', '2015.', '2021.'], 'Filmovi i serije', 'U posljednjem filmu Bond umire.', 'EON Productions', 3),
    ('Poredaj knjige o Harryju Potteru od prve.', ['Kamen mudraca', 'Odaja tajni', 'Zatočenik Azkabana', 'Plameni pehar', 'Red feniksa'], ['1.', '2.', '3.', '4.', '5.'], 'Zanimljivosti', 'Slijede Princ miješane krvi i Darovi smrti.', 'Bloomsbury', 1),
    ('Poredaj Shrek filmove redom.', ['Shrek', 'Shrek 2', 'Shrek Treći', 'Shrek zauvijek'], ['2001.', '2004.', '2007.', '2010.'], 'Filmovi i serije', 'Peti film najavljen je za 2027.', 'DreamWorks', 1),
    ('Poredaj epizode originalne trilogije „Ratova zvijezda” po broju epizode.', ['Nova nada', 'Imperij uzvraća udarac', 'Povratak Jedija'], ['IV.', 'V.', 'VI.'], 'Filmovi i serije', 'Prequeli su epizode I.–III.', 'Lucasfilm', 2),
    ('Poredaj glazbene note od najduže.', ['Cijela nota', 'Polovinka', 'Četvrtinka', 'Osminka'], ['', '', '', ''], 'Glazba', 'Svaka je upola kraća od prethodne.', 'Glazbena teorija', 2),
    ('Poredaj predsjednike Hrvatske po redu.', ['Franjo Tuđman', 'Stjepan Mesić', 'Ivo Josipović', 'Kolinda Grabar-Kitarović', 'Zoran Milanović'], ['1990.', '2000.', '2010.', '2015.', '2020.'], 'Hrvatska', 'Godine označavaju početak mandata.', HE, 1),
    ('Poredaj hrvatske gradove od sjevera prema jugu.', ['Čakovec', 'Varaždin', 'Zagreb', 'Karlovac', 'Gospić'], ['46,4° N', '46,3° N', '45,8° N', '45,5° N', '44,5° N'], 'Hrvatska', 'Čakovec je najsjeverniji veći hrvatski grad.', 'Geografske koordinate', 3),
    ('Poredaj hrvatske gradove od zapada prema istoku.', ['Umag', 'Rijeka', 'Karlovac', 'Bjelovar', 'Ilok'], ['13,5° E', '14,4° E', '15,5° E', '16,8° E', '19,4° E'], 'Hrvatska', 'Ilok je najistočniji hrvatski grad.', 'Geografske koordinate', 3),
    ('Poredaj po veličini – od najmanje.', ['Mrav', 'Mačka', 'Pas (njemački ovčar)', 'Konj', 'Slon'], ['', '', '', '', ''], 'Životinje', 'Slon je najveća kopnena životinja.', 'National Geographic', 1),
    ('Poredaj valute po starosti – od najstarije.', ['Britanska funta', 'Američki dolar', 'Švicarski franak', 'Euro'], ['8. st.', '1792.', '1850.', '1999.'], 'Povijest', 'Funta je najstarija valuta koja je još u upotrebi.', B, 3),
    ('Poredaj gradove po broju stanovnika – od najvećeg.', ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Velika Gorica'], ['≈ 767 000', '≈ 161 000', '≈ 108 000', '≈ 96 000', '≈ 70 000', '≈ 61 000'], 'Hrvatska', 'Prema popisu stanovništva 2021.', 'DZS', 2),
    ('Poredaj formate papira od najvećeg.', ['A3', 'A4', 'A5', 'A6'], ['297 × 420 mm', '210 × 297 mm', '148 × 210 mm', '105 × 148 mm'], 'Zanimljivosti', 'Svaki je format upola manji od prethodnog.', 'ISO 216', 2),
    ('Poredaj odjevne veličine – od najveće.', ['XXL', 'XL', 'L', 'M', 'S'], ['', '', '', '', ''], 'Zanimljivosti', 'S znači small (malo).', 'Opće znanje', 1),
    ('Poredaj medalje – od najvrjednije.', ['Zlato', 'Srebro', 'Bronca'], ['1. mjesto', '2. mjesto', '3. mjesto'], 'Sport', 'Na Olimpijskim igrama zlatne medalje su zapravo pozlaćeno srebro.', 'MOO', 1),
    ('Poredaj pojaseve u judu – od početnika.', ['Bijeli', 'Žuti', 'Narančasti', 'Zeleni', 'Plavi', 'Smeđi'], ['', '', '', '', '', ''], 'Sport', 'Nakon smeđeg slijedi crni pojas.', 'Hrvatski judo savez', 3),
]

KNOWME = [
    'Koju bih pjesmu odabrao/la za naš prvi ples?', 'Koji bi film mogao/mogla gledati svake godine za Božić?', 'Koja mi je najdraža zimska aktivnost?',
    'Koji mi je najdraži zvuk?', 'Koja mi je najdraža riječ na hrvatskom?', 'Koja me hrana podsjeća na djetinjstvo?', 'Koju bih stvar najradije naučio/la od bake?',
    'Koja mi je najdraža tradicija u našoj obitelji?', 'Kamo bih otišao/otišla da imam samo jedan slobodan dan?', 'Koja mi je najdraža uspomena s mora?',
    'Što bih najradije radio/la u mirovini?', 'Kakav bih bio/bila kao roditelj?', 'Koji bi bio moj savršeni ručak nedjeljom?', 'Što bih ponio/ponijela iz kuće u kovčegu za mjesec dana?',
    'Koju bih seriju volio/voljela da nikad ne završi?', 'Koji mi je najdraži lik iz crtića?', 'Koja mi je najdraža emoji sličica?', 'Koju aplikaciju bih prvu izbrisao/la?',
    'Što najčešće zaboravim kad izlazim iz kuće?', 'Na što ne mogu reći ne?', 'Što mi najviše smeta kad netko radi u kući?', 'Kada sam zadnji put bio/bila jako ponosan/na na sebe?',
    'Koju sam vještinu nedavno naučio/la?', 'Koji mi je najdraži način opuštanja?', 'Što bih napravio/la da mi je zadnji dan na Zemlji?', 'Gdje bih volio/voljela da nam bude vjenčanje (ili gdje je bilo najljepše)?',
    'Koji mi je najdraži poklon koji sam dobio/la od tebe?', 'Što me kod tebe najviše nasmije?', 'Kako izgleda moje savršeno jutro?', 'Koja mi je navika koju nikako ne mogu promijeniti?',
    'Koji je moj „comfort food” kad mi je loše?', 'Koju bih poznatu osobu volio/voljela imati za susjeda?', 'Kakav bi bio moj kućni ljubimac iz snova?', 'U kojoj bih seriji volio/voljela živjeti?',
    'Što bih rekao/rekla da me netko pita što radim kao hobi?', 'Koji mi je najdraži kafić?', 'Koju bih vrstu tečaja upisao/la?', 'Koji mi je najdraži način putovanja – auto, vlak ili avion?',
]

LIST3 = [
    ('Nabroji tri stvari koje kupuješ svaki tjedan.', L('Kruh, Mlijeko, Jaja, Voće, Povrće, Kava, Sir, Meso, Voda, Jogurt, Toaletni papir, Deterdžent')),
    ('Nabroji tri stvari koje rade na struju, a nisu u kuhinji.', L('Televizor, Računalo, Fen, Usisivač, Perilica, Klima, Lampa, Punjač, Glačalo, Brijač, Ventilator, Radio')),
    ('Nabroji tri stvari koje imaju tipke.', L('Mobitel, Tipkovnica, Daljinski, Kalkulator, Klavir, Lift, Mikrovalna, Bankomat, Konzola, Perilica, Fotoaparat, Interfon')),
    ('Nabroji tri crtane serije iz djetinjstva.', L('Simpsoni, Tom i Jerry, Pčelica Maja, Smrfovi, Kremenkovi, Profesor Baltazar, Duck Tales, Pokémon, Pinokio, Nindža kornjače, Sailor Moon, Lessie')),
    ('Nabroji tri stvari koje radiš kad se probudiš.', L('Kava, Tuš, Pranje zubi, Doručak, Mobitel, Oblačenje, Budilica, WC, Rastezanje, Otvaranje prozora')),
    ('Nabroji tri razloga zašto ljudi idu u šetnju.', L('Zdravlje, Pas, Svjež zrak, Razgovor, Opuštanje, Mršavljenje, Lijepo vrijeme, Razmišljanje, Druženje')),
    ('Nabroji tri stvari koje rade ljudi na selu.', L('Rade u polju, Hrane životinje, Sade vrt, Beru voće, Kose travu, Muzu krave, Peku rakiju, Cijepaju drva, Prave sir')),
    ('Nabroji tri stvari koje ljudi rade na moru kad pada kiša.', L('Spavaju, Gledaju filmove, Igraju karte, Šeću u kabanici, Idu u kafić, Idu u muzej, Kupaju se svejedno, Kuhaju')),
    ('Nabroji tri stvari koje se rade na Silvestrovo.', L('Vatromet, Šampanjac, Ples, Odbrojavanje, Poljubac, Zabava, Koncert na trgu, Večera, Zdravica')),
    ('Nabroji tri stvari koje ti trebaju za pizzu.', L('Tijesto, Brašno, Kvasac, Rajčica, Sir, Mozzarella, Šunka, Gljive, Origano, Pećnica, Maslinovo ulje')),
    ('Nabroji tri stvari koje se nalaze u svakoj kupaonici.', L('Wc, Umivaonik, Ogledalo, Ručnik, Sapun, Četkica za zube, Pasta, Tuš, Kada, Toaletni papir')),
    ('Nabroji tri stvari koje zovemo „pametnim”.', L('Pametni telefon, Pametni sat, Pametni televizor, Pametna kuća, Pametna žarulja, Pametni zvučnik, Pametni hladnjak')),
    ('Nabroji tri stvari koje se rade s prijateljima ljeti.', L('Kupanje, Roštilj, Kampiranje, Koncerti, Izlasci, Putovanja, Odbojka na pijesku, Sladoled, Vožnja barkom')),
    ('Nabroji tri stvari koje imaju više od četiri noge.', L('Pauk, Mrav, Stonoga, Hobotnica, Rak, Stol s pet nogu, Kukac, Jastog, Škorpion')),
    ('Nabroji tri stvari koje se mogu staviti na palačinku.', L('Nutella, Pekmez, Med, Orasi, Šećer, Banana, Sladoled, Šlag, Sir, Šunka, Jagode, Limun')),
    ('Nabroji tri imena koja počinju slovom M.', L('Marko, Marija, Matej, Mia, Mateo, Maja, Mihael, Martina, Marin, Mirela, Mladen, Monika')),
    ('Nabroji tri imena koja počinju slovom A.', L('Ana, Ante, Antonija, Ivan? ne, Andrej, Andrea, Antun, Adrijana, Alen, Anita, Ana Marija, Aleksandar')),
    ('Nabroji tri riječi koje počinju s „pre”.', L('Prekid, Predsjednik, Prečac, Preko, Prenoćiti, Prekosutra, Preskočiti, Prebaciti, Prezime')),
]
LIST3 = [(t, [e for e in ex if '?' not in e]) for t, ex in LIST3]
