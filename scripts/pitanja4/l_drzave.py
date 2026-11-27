# Pitanja generirana iz tablice država (okvirni podaci: UN 2023., CIA World Factbook).
# Samo jasne razlike (≥ 25 % među susjednim stavkama), da odgovori ne budu sporni.
import random

SRC = 'UN World Population Prospects 2023 / CIA World Factbook (okvirno)'
# ime, genitiv, glavni grad (None = sporno), regija, površina km² (None), stanovnici u milijunima (None)
D = """Hrvatska|Hrvatske|Zagreb|EU|56594|3.87
Slovenija|Slovenije|Ljubljana|EU|20271|2.1
Mađarska|Mađarske|Budimpešta|EU|93030|9.6
Austrija|Austrije|Beč|EU|83879|9.1
Njemačka|Njemačke|Berlin|EU|357588|84
Francuska|Francuske|Pariz|EU|551695|68
Italija|Italije|Rim|EU|302068|59
Španjolska|Španjolske|Madrid|EU|505990|48
Portugal|Portugala|Lisabon|EU|92212|10.4
Ujedinjeno Kraljevstvo|Ujedinjenog Kraljevstva|London|EU|243610|67.7
Irska|Irske|Dublin|EU|70273|5.3
Nizozemska|Nizozemske|Amsterdam|EU|41850|17.9
Belgija|Belgije|Bruxelles|EU|30689|11.8
Luksemburg|Luksemburga|Luxembourg|EU|2586|0.66
Švicarska|Švicarske|Bern|EU|41285|8.8
Poljska|Poljske|Varšava|EU|312696|37.6
Češka|Češke|Prag|EU|78871|10.9
Slovačka|Slovačke|Bratislava|EU|49035|5.4
Danska|Danske|Kopenhagen|EU|42933|5.9
Švedska|Švedske|Stockholm|EU|450295|10.5
Norveška|Norveške|Oslo|EU|385207|5.5
Finska|Finske|Helsinki|EU|338455|5.6
Island|Islanda|Reykjavík|EU|103000|0.39
Estonija|Estonije|Tallinn|EU|45339|1.37
Latvija|Latvije|Riga|EU|64589|1.88
Litva|Litve|Vilnius|EU|65300|2.86
Bjelorusija|Bjelorusije|Minsk|EU|207600|9.2
Ukrajina|Ukrajine|Kijev|EU|603550|
Rumunjska|Rumunjske|Bukurešt|EU|238397|19
Bugarska|Bugarske|Sofija|EU|110994|6.4
Grčka|Grčke|Atena|EU|131957|10.4
Bosna i Hercegovina|Bosne i Hercegovine|Sarajevo|EU|51209|3.2
Crna Gora|Crne Gore|Podgorica|EU|13812|0.62
Sjeverna Makedonija|Sjeverne Makedonije|Skopje|EU|25713|1.83
Albanija|Albanije|Tirana|EU|28748|2.8
Malta|Malte|Valletta|EU|316|0.53
Turska|Turske|Ankara|AZ|783562|85
Rusija|Rusije|Moskva|EU|17098246|144
Kina|Kine|Peking|AZ|9596961|1410
Indija|Indije|New Delhi|AZ|3287263|1430
Japan|Japana|Tokio|AZ|377975|124
Južna Koreja|Južne Koreje|Seul|AZ|100210|51.7
Sjeverna Koreja|Sjeverne Koreje|Pjongjang|AZ|120538|26
Indonezija|Indonezije|Džakarta|AZ|1904569|277
Filipini|Filipina|Manila|AZ|300000|117
Vijetnam|Vijetnama|Hanoj|AZ|331212|99
Tajland|Tajlanda|Bangkok|AZ|513120|71.8
Malezija|Malezije|Kuala Lumpur|AZ|330803|34
Pakistan|Pakistana|Islamabad|AZ|881913|240
Bangladeš|Bangladeša|Dhaka|AZ|147570|173
Iran|Irana|Teheran|AZ|1648195|89
Irak|Iraka|Bagdad|AZ|438317|45
Saudijska Arabija|Saudijske Arabije|Rijad|AZ|2149690|36
Afganistan|Afganistana|Kabul|AZ|652230|41
Kazahstan|Kazahstana|Astana|AZ|2724900|19.6
Mongolija|Mongolije|Ulan Bator|AZ|1564116|3.4
Nepal|Nepala|Katmandu|AZ|147516|30.5
Egipat|Egipta|Kairo|AF|1001450|112
Nigerija|Nigerije|Abuja|AF|923768|223
Etiopija|Etiopije|Adis Abeba|AF|1104300|126
Kenija|Kenije|Nairobi|AF|580367|55
Južnoafrička Republika|Južnoafričke Republike||AF|1221037|60
Maroko|Maroka|Rabat|AF|446550|37.8
Alžir|Alžira|Alžir|AF|2381741|45.6
Tunis|Tunisa|Tunis|AF|163610|12.5
Gana|Gane|Accra|AF|238533|34
Tanzanija|Tanzanije|Dodoma|AF|945087|67
DR Kongo|DR Konga|Kinšasa|AF|2344858|102
Angola|Angole|Luanda|AF|1246700|36.7
Madagaskar|Madagaskara|Antananarivo|AF|587041|30
Sudan|Sudana|Kartum|AF|1886068|48
Senegal|Senegala|Dakar|AF|196722|18
SAD|SAD-a|Washington|AM|9833520|335
Kanada|Kanade|Ottawa|AM|9984670|39
Meksiko|Meksika|Ciudad de México|AM|1964375|129
Brazil|Brazila|Brasília|AM|8515767|216
Argentina|Argentine|Buenos Aires|AM|2780400|46
Čile|Čilea|Santiago|AM|756102|19.6
Peru|Perua|Lima|AM|1285216|34
Kolumbija|Kolumbije|Bogota|AM|1141748|52
Venezuela|Venezuele|Caracas|AM|916445|28
Kuba|Kube|Havana|AM|109884|11.1
Ekvador|Ekvadora|Quito|AM|283561|18
Urugvaj|Urugvaja|Montevideo|AM|176215|3.4
Paragvaj|Paragvaja|Asunción|AM|406752|6.9
Australija|Australije|Canberra|AM|7692024|26.6
Novi Zeland|Novog Zelanda|Wellington|AM|268021|5.2"""

C = []
for line in D.splitlines():
    n, g, cap, reg, area, pop = line.split('|')
    C.append(dict(n=n, g=g, cap=cap or None, reg=reg, area=int(area) if area else None, pop=float(pop) if pop else None))

rnd = random.Random(20261128)

def fmt_area(a):
    return f'≈ {a:,} km²'.replace(',', ' ')

def fmt_pop(p):
    if p >= 100: return f'≈ {round(p):,} mil.'.replace(',', ' ')
    if p >= 10: return f'≈ {round(p)} mil.'
    return f'≈ {p:.1f} mil.'.replace('.', ',')

QUIZ, ORDER, HL, CLOSEST = [], [], [], []

# --- glavni gradovi (netočni odgovori: glavni gradovi iz iste regije) ---
for c in C:
    if not c['cap']: continue
    pool = [x['cap'] for x in C if x['reg'] == c['reg'] and x['cap'] and x is not c]
    wrong = rnd.sample(pool, 3)
    d = 1 if c['reg'] == 'EU' else 2
    QUIZ.append((f'Koji je glavni grad {c["g"]}?', [c['cap']] + wrong, 'Geografija', f'Glavni grad {c["g"]} je {c["cap"]}.', SRC, d))

# --- redoslijed po površini / broju stanovnika ---
def ordered_sets(key, n_sets, label, fmt, prompt):
    made = set()
    cand = [c for c in C if c[key]]
    tries = 0
    while len(made) < n_sets and tries < 20000:
        tries += 1
        reg = rnd.choice(['EU', 'AZ', 'AF', 'AM', 'SVE'])
        pool = cand if reg == 'SVE' else [c for c in cand if c['reg'] == reg]
        if len(pool) < 5: continue
        pick = sorted(rnd.sample(pool, 5), key=lambda c: -c[key])
        if any(pick[i][key] < pick[i + 1][key] * 1.25 for i in range(4)): continue
        k = tuple(sorted(c['n'] for c in pick))
        if k in made: continue
        made.add(k)
        ORDER.append((prompt, [c['n'] for c in pick], [fmt(c[key]) for c in pick], 'Geografija',
                      f'Prva je {pick[0]["n"]} ({fmt(pick[0][key])}), a posljednja {pick[-1]["n"]} ({fmt(pick[-1][key])})', SRC, 2 if reg == 'EU' else 3))

ordered_sets('area', 45, 'površini', fmt_area, 'Poredaj države po površini – od najveće.')
ordered_sets('pop', 45, 'stanovnicima', fmt_pop, 'Poredaj države po broju stanovnika – od najveće.')

# --- veće ili manje: broj stanovnika i površina ---
VM = ['Više', 'Manje']; VEC = ['Veću', 'Manju']
made = set()
while len(HL) < 90:
    a, b = rnd.sample([c for c in C if c['pop']], 2)
    key = rnd.choice(['pop', 'area'])
    if not a[key] or not b[key]: continue
    hi, lo = max(a[key], b[key]), min(a[key], b[key])
    if hi < lo * 1.4 or hi > lo * 30: continue
    k = (a['n'], b['n'], key)
    if k in made: continue
    made.add(k)
    if key == 'pop':
        HL.append((f'Ima li {a["n"]} više ili manje stanovnika od {b["g"]}?', VM, 0 if a['pop'] > b['pop'] else 1, 'Geografija',
                   f'{a["n"]}: {fmt_pop(a["pop"])}; {b["n"]}: {fmt_pop(b["pop"])}', SRC, 2))
    else:
        HL.append((f'Ima li {a["n"]} veću ili manju površinu od {b["g"]}?', VEC, 0 if a['area'] > b['area'] else 1, 'Geografija',
                   f'{a["n"]}: {fmt_area(a["area"])}; {b["n"]}: {fmt_area(b["area"])}', SRC, 2))

# --- procjena broja stanovnika ---
for c in rnd.sample([c for c in C if c['pop'] and c['pop'] >= 2], 55):
    CLOSEST.append((f'Koliko otprilike stanovnika ima {c["n"]} (u milijunima)?', c['pop'], 'mil.', 'Geografija',
                    f'{c["n"]} ima {fmt_pop(c["pop"])} stanovnika', SRC, 2 if c['reg'] == 'EU' else 3))
