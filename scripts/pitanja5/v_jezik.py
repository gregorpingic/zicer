# Dijalekti, poslovice, mladunčad, filmske rečenice – peti paket.
import random
rnd = random.Random(5222)
QUIZ = []
HE = 'Hrvatski jezični portal / narodni govor'

def gen(rows, qfmt, cat, efmt, src, d):
    vals = sorted({v for _, v in rows})
    for k, v in rows:
        QUIZ.append((qfmt(k), [v] + rnd.sample([x for x in vals if x != v], 3), cat, efmt(k, v), src, d))

DALM = [('ponistra', 'prozor'), ('kužina', 'kuhinja'), ('pjat', 'tanjur'), ('balun', 'lopta'), ('lancun', 'plahta'), ('šugaman', 'ručnik'),
        ('kantun', 'kut'), ('škovacera', 'kanta za smeće'), ('postola', 'cipela'), ('pirun', 'vilica'), ('kamara', 'soba'), ('ura', 'sat'),
        ('šparet', 'štednjak'), ('kušin', 'jastuk'), ('armerun', 'ormar'), ('pomidor', 'rajčica'), ('kapula', 'luk'), ('teća', 'lonac'),
        ('lavandin', 'umivaonik'), ('ćakula', 'razgovor'), ('fjaka', 'ugodna lijenost'), ('bonaca', 'mirno more'), ('marenda', 'užina'),
        ('kaleta', 'uska ulica'), ('dišpet', 'inat'), ('pršura', 'tava')]
gen(DALM, lambda w: f'Što na dalmatinskom znači riječ „{w}”?', 'Hrvatska', lambda w, m: f'„{w.capitalize()}” u Dalmaciji znači: {m}.', HE, 2)

KAJ = [('hiža', 'kuća'), ('japa', 'otac'), ('pajdaš', 'prijatelj'), ('cuker', 'šećer'), ('fajn', 'fino, dobro'), ('teler', 'tanjur'),
       ('vura', 'sat'), ('gablec', 'užina na poslu'), ('denes', 'danas'), ('fčera', 'jučer'), ('kaj', 'što'), ('zutra', 'sutra'),
       ('štenge', 'stepenice'), ('špajza', 'smočnica'), ('kuruza', 'kukuruz'), ('vugel', 'ugao'), ('lajbek', 'prsluk'), ('kušleci', 'poljupci')]
gen(KAJ, lambda w: f'Što na kajkavskom (zagorskom/zagrebačkom) znači riječ „{w}”?', 'Hrvatska', lambda w, m: f'„{w.capitalize()}” na kajkavskom znači: {m}.', HE, 2)

PROVERBS = [('Tko rano rani…', 'dvije sreće grabi'), ('Tko visoko leti…', 'nisko pada'), ('Bolje vrabac u ruci…', 'nego golub na grani'),
            ('Tko drugome jamu kopa…', 'sam u nju pada'), ('Ne pada snijeg…', 'da pokrije brijeg, nego da svaka zvijer pokaže svoj trag'),
            ('Gdje ima dima…', 'ima i vatre'), ('Tiha voda…', 'brege dere'), ('Čija sila…', 'tog i pravda'), ('Daljnje oči…', 'koje se ne vide'),
            ('U laži su…', 'kratke noge'), ('Ne hvali dan…', 'prije večeri'), ('Bez muke…', 'nema nauke'),
            ('Kako siješ…', 'tako žanješ'), ('Gladan medvjed…', 'ne igra'), ('Tko pjeva…', 'zlo ne misli'), ('Vuk dlaku mijenja…', 'ali ćud nikada'),
            ('Kad mačke nema…', 'miševi kolo vode'), ('Prvi mrak…', 'nije mrak'), ('Što možeš danas…', 'ne ostavljaj za sutra')]
PROVERBS = [(a, b) for a, b in PROVERBS if a.rstrip('…') != b and 'Daljnje' not in a and 'Prvi mrak' not in a]
gen(PROVERBS, lambda a: f'Kako završava poslovica: „{a}”', 'Hrvatska', lambda a, b: f'„{a[:-1]} {b}.”', 'Hrvatske narodne poslovice', 1)

YOUNG = [('konja', 'ždrijebe'), ('krave', 'tele'), ('ovce', 'janje'), ('koze', 'jare'), ('svinje', 'prase'), ('psa', 'štene'), ('mačke', 'mače'),
         ('kokoši', 'pile'), ('patke', 'pače'), ('guske', 'guščić'), ('jelena', 'lane'), ('medvjeda', 'medvjedić'), ('žabe', 'punoglavac'),
         ('leptira', 'gusjenica'), ('lava', 'lavić'), ('magarca', 'magare'), ('vuka', 'vučić'), ('lisice', 'lisičić')]
gen(YOUNG, lambda a: f'Kako se zove mladunče {a}?', 'Životinje', lambda a, m: f'Mladunče {a} zove se {m}.', 'Hrvatski jezični portal', 1)

QUOTES = [('„Svibanj je, a ja sam još živ.”', 'NE'),
          ('„Neka Sila bude s tobom.”', 'Ratovi zvijezda'), ('„Vratit ću se.”', 'Terminator'), ('„Život je kao kutija čokoladnih bombona.”', 'Forrest Gump'),
          ('„Gledam u tebe, mala.”', 'Casablanca'), ('„Dat ću mu ponudu koju ne može odbiti.”', 'Kum'), ('„Hakuna matata!”', 'Kralj lavova'),
          ('„Do beskonačnosti i dalje!”', 'Priča o igračkama'), ('„Samo nastavi plivati.”', 'Potraga za Nemom'), ('„Ja sam kralj svijeta!”', 'Titanic'),
          ('„Houston, imamo problem.”', 'Apollo 13'), ('„Zašto tako ozbiljno?”', 'Vitez tame'), ('„Moje ime je Bond. James Bond.”', 'Dr. No'),
          ('„E.T. zove kući.”', 'E.T.'), ('„Vidim mrtve ljude.”', 'Šesto čulo'), ('„Pusti to (Let It Go)!”', 'Snježno kraljevstvo'),
          ('„Prvo pravilo kluba je: o klubu se ne priča.”', 'Klub boraca'), ('„Trebat će nam veći brod.”', 'Čeljusti'),
          ('„Nitko ne stavlja Baby u kut.”', 'Prljavi ples'), ('„Pozdravi mog malog prijatelja!”', 'Lice s ožiljkom'), ('„Ceste? Tamo kamo idemo, ne trebaju nam ceste.”', 'Povratak u budućnost'),
          ('„Uzmi crvenu pilulu.”', 'Matrix'), ('„Kod kuće je najljepše.”', 'Čarobnjak iz Oza'), ('„Dobrodošli u Jurski park!”', 'Jurski park')]
QUOTES = [q for q in QUOTES if q[1] != 'NE']
gen(QUOTES, lambda q: f'Iz kojeg je filma rečenica {q}', 'Filmovi i serije', lambda q, f: f'Rečenica je iz filma „{f}”.', 'IMDb', 2)
