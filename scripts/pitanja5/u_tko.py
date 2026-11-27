# „Tko je…” – pitanja iz provjerenih popisa (pjesme, knjige, filmovi, slike, izumi).
import random
rnd = random.Random(5150)
QUIZ = []

def gen(block, qfmt, cat, efmt, src, d):
    rows = [tuple(x.split('|')) for x in block.strip().split('\n')]
    vals = sorted({v for _, v in rows})
    for k, v in rows:
        QUIZ.append((qfmt(k), [v] + rnd.sample([x for x in vals if x != v], 3), cat, efmt(k, v), src, d))

SONGS = """Bohemian Rhapsody|Queen
Billie Jean|Michael Jackson
Like a Prayer|Madonna
Hey Jude|The Beatles
Satisfaction|The Rolling Stones
Smells Like Teen Spirit|Nirvana
Wonderwall|Oasis
Hotel California|Eagles
Stairway to Heaven|Led Zeppelin
Sweet Child o' Mine|Guns N' Roses
Livin' on a Prayer|Bon Jovi
With or Without You|U2
Every Breath You Take|The Police
Imagine|John Lennon
Purple Rain|Prince
I Will Always Love You|Whitney Houston
My Heart Will Go On|Céline Dion
...Baby One More Time|Britney Spears
Crazy in Love|Beyoncé
Umbrella|Rihanna
Rolling in the Deep|Adele
Shape of You|Ed Sheeran
Shake It Off|Taylor Swift
Bad Guy|Billie Eilish
Levitating|Dua Lipa
Poker Face|Lady Gaga
Hips Don't Lie|Shakira
Uptown Funk|Bruno Mars
Blinding Lights|The Weeknd
Despacito|Luis Fonsi
Gangnam Style|PSY
Dancing Queen|ABBA
Africa|Toto
Take On Me|a-ha
Sweet Dreams|Eurythmics
Wake Me Up|Avicii
Lose Yourself|Eminem
Viva la Vida|Coldplay
Seven Nation Army|The White Stripes
Zombie|The Cranberries
Losing My Religion|R.E.M.
Enter Sandman|Metallica
Wind of Change|Scorpions
Careless Whisper|George Michael
Angels|Robbie Williams
Hello|Adele
Thriller|Michael Jackson
Wannabe|Spice Girls
I Want It That Way|Backstreet Boys
Mamma Mia|ABBA"""
gen(SONGS, lambda s: f'Tko izvodi pjesmu „{s}”?', 'Glazba', lambda s, p: f'„{s}” izvodi {p}.', 'Službene diskografije izvođača', 2)

HR_SONGS = """Galeb i ja|Oliver Dragojević
Cesarica|Oliver Dragojević
Libar|Gibonni
Zlatne godine|Gibonni
Moja štikla|Severina
Italiana|Severina
Marija Magdalena|Doris Dragović
Mojoj majci|Prljavo kazalište
Kiše jesenje|Prljavo kazalište
Jesen u meni|Parni valjak
Kao ti|Parni valjak
Buđenje proljeća|Hladno pivo
Rim Tim Tagi Dim|Baby Lasagna
Lijepa li si|Thompson
Molitva za Magdalenu|Oliver Dragojević
Bižuterija|Jelena Rozga
Ja sam za ples|Novi fosili
Rock Me|Riva
Sretno dijete|Prljavo kazalište"""
gen(HR_SONGS, lambda s: f'Tko pjeva pjesmu „{s}”?', 'Glazba', lambda s, p: f'Pjesmu „{s}” izvodi {p}.', 'Hrvatska diskografska udruga / HE', 2)

BOOKS = """Rat i mir|Lav Tolstoj
Ana Karenjina|Lav Tolstoj
Zločin i kazna|Fjodor Dostojevski
Braća Karamazovi|Fjodor Dostojevski
Jadnici|Victor Hugo
Zvonar crkve Notre-Dame|Victor Hugo
Oliver Twist|Charles Dickens
Božićna priča|Charles Dickens
Ponos i predrasude|Jane Austen
Starac i more|Ernest Hemingway
Zbogom oružje|Ernest Hemingway
Veliki Gatsby|F. Scott Fitzgerald
1984.|George Orwell
Životinjska farma|George Orwell
Hobit|J. R. R. Tolkien
Gospodar prstenova|J. R. R. Tolkien
Harry Potter i Kamen mudraca|J. K. Rowling
Mali princ|Antoine de Saint-Exupéry
Alisa u zemlji čudesa|Lewis Carroll
Pustolovine Toma Sawyera|Mark Twain
Put oko svijeta za 80 dana|Jules Verne
20 000 milja pod morem|Jules Verne
Tri mušketira|Alexandre Dumas
Grof Monte Cristo|Alexandre Dumas
Don Quijote|Miguel de Cervantes
Božanstvena komedija|Dante Alighieri
Romeo i Julija|William Shakespeare
Hamlet|William Shakespeare
Ubojstvo u Orient Expressu|Agatha Christie
Da Vincijev kod|Dan Brown
Alkemičar|Paulo Coelho
Sto godina samoće|Gabriel García Márquez
Preobrazba|Franz Kafka
Drakula|Bram Stoker
Frankenstein|Mary Shelley
Čudnovate zgode šegrta Hlapića|Ivana Brlić-Mažuranić
Zlatarovo zlato|August Šenoa
Povratak Filipa Latinovicza|Miroslav Krleža
Na Drini ćuprija|Ivo Andrić
Judita|Marko Marulić
Dundo Maroje|Marin Držić
Družba Pere Kvržice|Mato Lovrak
Vlak u snijegu|Mato Lovrak
Kiklop|Ranko Marinković"""
gen(BOOKS, lambda b: f'Tko je napisao djelo „{b}”?', 'Zanimljivosti', lambda b, a: f'„{b}” je napisao/la {a}.', 'Encyclopaedia Britannica / HE', 2)

DIRECTORS = """Čeljusti|Steven Spielberg
Schindlerova lista|Steven Spielberg
Titanic|James Cameron
Avatar|James Cameron
Pakleni šund|Quentin Tarantino
Đango bez okova|Quentin Tarantino
Početak (Inception)|Christopher Nolan
Oppenheimer|Christopher Nolan
Kum|Francis Ford Coppola
Apokalipsa danas|Francis Ford Coppola
Taksist|Martin Scorsese
Vuk s Wall Streeta|Martin Scorsese
Psiho|Alfred Hitchcock
Ptice|Alfred Hitchcock
Isijavanje|Stanley Kubrick
2001.: Odiseja u svemiru|Stanley Kubrick
Gospodar prstenova|Peter Jackson
Gladijator|Ridley Scott
Osmi putnik|Ridley Scott
Edward Škaroruki|Tim Burton
Forrest Gump|Robert Zemeckis
Povratak u budućnost|Robert Zemeckis
Ratovi zvijezda (1977.)|George Lucas
Parazit|Bong Joon-ho
Barbie|Greta Gerwig
Klub boraca|David Fincher"""
gen(DIRECTORS, lambda f: f'Tko je režirao film „{f}”?', 'Filmovi i serije', lambda f, r: f'„{f}” je režirao/la {r}.', 'IMDb', 3)

ACTORS = """Forrest Gump|Tom Hanks
Brodolom života (Cast Away)|Tom Hanks
Titanic|Leonardo DiCaprio
Povratnik|Leonardo DiCaprio
Gladijator|Russell Crowe
Matrix|Keanu Reeves
John Wick|Keanu Reeves
Nemoguća misija|Tom Cruise
Top Gun|Tom Cruise
Pirati s Kariba|Johnny Depp
Edward Škaroruki|Johnny Depp
Rocky|Sylvester Stallone
Terminator|Arnold Schwarzenegger
Umri muški|Bruce Willis
Zgodna žena (Pretty Woman)|Julia Roberts
Sam u kući|Macaulay Culkin
Gospođa Doubtfire|Robin Williams
Maska|Jim Carrey
Kum|Marlon Brando
Indiana Jones|Harrison Ford
Kad jaganjci utihnu|Anthony Hopkins
Dobar, loš, zao|Clint Eastwood
Mamma Mia!|Meryl Streep
Barbie|Margot Robbie
Igre gladi|Jennifer Lawrence
La La Land|Ryan Gosling
Iron Man|Robert Downey Jr.
Crna udovica|Scarlett Johansson
Vitez tame|Christian Bale"""
gen(ACTORS, lambda f: f'Tko glumi glavnu ulogu u filmu „{f}”?', 'Filmovi i serije', lambda f, a: f'Glavnu ulogu u „{f}” igra {a}.', 'IMDb', 2)

ART = """Mona Lisa|Leonardo da Vinci
Posljednja večera|Leonardo da Vinci
Zvjezdana noć|Vincent van Gogh
Suncokreti|Vincent van Gogh
Krik|Edvard Munch
Guernica|Pablo Picasso
Postojanost pamćenja|Salvador Dalí
Rođenje Venere|Sandro Botticelli
Djevojka s bisernom naušnicom|Johannes Vermeer
Noćna straža|Rembrandt
Poljubac|Gustav Klimt
Lopoči|Claude Monet
Stvaranje Adama|Michelangelo
Atenska škola|Rafael
Američka gotika|Grant Wood
Campbellove juhe|Andy Warhol
Grgur Ninski (kip)|Ivan Meštrović
Mise en scène? |NE"""
ART = '\n'.join(l for l in ART.split('\n') if not l.endswith('|NE'))
gen(ART, lambda s: f'Tko je autor djela „{s}”?', 'Zanimljivosti', lambda s, a: f'Autor djela „{s}” je {a}.', 'Encyclopaedia Britannica', 2)

INVENT = """Telefon|Alexander Graham Bell
Žarulja (praktična)|Thomas Edison
Fonograf|Thomas Edison
Izmjenična struja (sustav)|Nikola Tesla
Radio|Guglielmo Marconi
Tiskarski stroj s pomičnim slovima|Johannes Gutenberg
Penicilin|Alexander Fleming
Mehanička olovka (Penkala)|Slavoljub Penkala
Padobran (Homo volans)|Faust Vrančić
Daktiloskopija (otisci prstiju)|Ivan Vučetić
Torpedo|Ivan Lupis
Parni stroj (usavršeni)|James Watt
Dinamit|Alfred Nobel
Svjetska mreža (WWW)|Tim Berners-Lee
Automobil s benzinskim motorom|Karl Benz
Zrakoplov s motorom|Braća Wright
Cjepivo protiv bjesnoće|Louis Pasteur
Gramofon|Emile Berliner
Teleskop (usavršeni)|Galileo Galilei
Rubikova kocka|Ernő Rubik"""
gen(INVENT, lambda s: f'Tko je izumio: {s}?', 'Znanost', lambda s, a: f'{s} – izumitelj: {a}.', 'Encyclopaedia Britannica / HE', 2)
