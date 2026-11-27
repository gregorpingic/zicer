# Najviši vrhovi, gradovi na rijekama, sportaši i sportovi – peti paket.
import random
rnd = random.Random(5333)
QUIZ = []

def gen(rows, qfmt, cat, efmt, src, d):
    vals = sorted({v for _, v in rows})
    for k, v in rows:
        QUIZ.append((qfmt(k), [v] + rnd.sample([x for x in vals if x != v], 3), cat, efmt(k, v), src, d))

PEAKS = [('Hrvatske', 'Dinara (Sinjal)'), ('Slovenije', 'Triglav'), ('Austrije', 'Grossglockner'), ('Švicarske', 'Dufourspitze (Monte Rosa)'),
         ('Njemačke', 'Zugspitze'), ('Španjolske', 'Teide'), ('Grčke', 'Olimp'), ('Bosne i Hercegovine', 'Maglić'), ('Poljske', 'Rysy'),
         ('Češke', 'Sněžka'), ('Slovačke', 'Gerlachovský štít'), ('Mađarske', 'Kékes'), ('Rumunjske', 'Moldoveanu'), ('Bugarske', 'Musala'),
         ('Norveške', 'Galdhøpiggen'), ('Švedske', 'Kebnekaise'), ('Ujedinjenog Kraljevstva', 'Ben Nevis'), ('SAD-a', 'Denali'), ('Japana', 'Fuji'),
         ('Turske', 'Ararat'), ('Rusije', 'Elbrus'), ('Argentine', 'Aconcagua'), ('Kanade', 'Mount Logan'), ('Tanzanije', 'Kilimandžaro'),
         ('Nepala', 'Mount Everest'), ('Sjeverne Makedonije', 'Korab')]
gen(PEAKS, lambda c: f'Koji je najviši vrh {c}?', 'Geografija', lambda c, p: f'Najviši vrh {c} je {p}.', 'Encyclopaedia Britannica', 3)

RIVERS = [('Beč', 'Dunav'), ('Budimpešta', 'Dunav'), ('Bratislava', 'Dunav'), ('Vukovar', 'Dunav'), ('Pariz', 'Seina'), ('London', 'Temza'),
          ('Rim', 'Tiber'), ('Prag', 'Vltava'), ('Firenca', 'Arno'), ('Köln', 'Rajna'), ('Dresden', 'Elba'), ('Varšava', 'Visla'), ('Kairo', 'Nil'),
          ('Bagdad', 'Tigris'), ('Lisabon', 'Tejo'), ('Sevilla', 'Guadalquivir'), ('Zagreb', 'Sava'), ('Osijek', 'Drava'), ('Karlovac', 'Kupa'),
          ('Mostar', 'Neretva'), ('Metković', 'Neretva'), ('Omiš', 'Cetina'), ('Ljubljana', 'Ljubljanica'), ('New Orleans', 'Mississippi'),
          ('Skradin', 'Krka'), ('Varaždin', 'Drava'), ('Slavonski Brod', 'Sava'), ('Kijev', 'Dnjepar'), ('Sankt Peterburg', 'Neva')]
gen(RIVERS, lambda c: f'Na kojoj rijeci leži {c}?', 'Geografija', lambda c, r: f'{c} leži na rijeci {r}.', 'Geografski atlas', 2)

SPORT = [('Michael Phelps', 'Plivanje'), ('Usain Bolt', 'Atletika'), ('Tiger Woods', 'Golf'), ('Lewis Hamilton', 'Formula 1'),
         ('Simone Biles', 'Gimnastika'), ('Valentino Rossi', 'Motociklizam'), ('Tadej Pogačar', 'Biciklizam'), ('Mikaela Shiffrin', 'Skijanje'),
         ('LeBron James', 'Košarka'), ('Wayne Gretzky', 'Hokej na ledu'), ('Floyd Mayweather', 'Boks'), ('Magnus Carlsen', 'Šah'),
         ('Sandra Perković', 'Atletika'), ('Blanka Vlašić', 'Atletika'), ('Domagoj Duvnjak', 'Rukomet'), ('Ivano Balić', 'Rukomet'),
         ('Filip Hrgović', 'Boks'), ('Martin Sinković', 'Veslanje'), ('Damir Martin', 'Veslanje'), ('Josip Glasnović', 'Streljaštvo'),
         ('Matea Jelić', 'Taekwondo'), ('Tin Srbić', 'Gimnastika'), ('Sara Kolak', 'Atletika'), ('Petra Kvitová', 'Tenis'),
         ('Janica Kostelić', 'Skijanje'), ('Ivica Kostelić', 'Skijanje'), ('Dražen Petrović', 'Košarka'), ('Toni Kukoč', 'Košarka'),
         ('Goran Ivanišević', 'Tenis'), ('Marin Čilić', 'Tenis'), ('Luka Modrić', 'Nogomet'), ('Joško Gvardiol', 'Nogomet'),
         ('Mirko Filipović Cro Cop', 'MMA (borilački sportovi)'), ('Novak Đoković', 'Tenis'), ('Shaun White', 'Snowboard'), ('Sebastian Coe', 'Atletika'),
         ('Nadia Comăneci', 'Gimnastika'), ('Eddy Merckx', 'Biciklizam'), ('Ayrton Senna', 'Formula 1'), ('Garri Kasparov', 'Šah')]
gen(SPORT, lambda p: f'U kojem se sportu natječe ili natjecao/la {p}?', 'Sport', lambda p, s: f'{p} – sport: {s}.', 'Olympedia / službeni profili', 2)
