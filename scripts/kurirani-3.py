# Slaže treći kurirani paket iz scripts/pitanja3/*.py i odbacuje duplikate u odnosu na postojeća pitanja.
# Pokretanje: python3 scripts/kurirani-2.py <postojeća pitanja.json> <izlaz.json>
import json, random, re, sys, unicodedata
sys.path.insert(0, __file__.rsplit('/', 1)[0] + '/pitanja3')
import e_kategorije as E, f_redoslijed as C, g_opis_riskiraj as G, h_cinjenice as Bc

existing = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
rnd = random.Random(2026)

def norm(s):
    s = unicodedata.normalize('NFD', s.lower().replace('đ', 'd'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '', s)

def key(q):
    t = q['type']
    if t in ('association', 'describe'):
        return 'ans:' + norm(q['answer']) + ':' + t
    if t == 'oddone':
        return 'odd:' + ''.join(sorted(norm(x) for x in q['items']))
    if t == 'order':
        return 'ord:' + ''.join(norm(x) for x in q['items'])
    return 'txt:' + norm(q.get('question') or q.get('prompt') or q.get('statement') or q.get('topic') or '')

seen = {key(q) for q in existing}
out, dup = [], []
counters = {}

def add(q):
    k = key(q)
    if k in seen:
        dup.append((q['type'], k[:60]))
        return
    seen.add(k)
    counters[q['type']] = counters.get(q['type'], 0) + 1
    q['id'] = f"kur3-{q['type']}-{counters[q['type']]:03d}"
    out.append(q)

def shuffled(opts):
    idx = list(range(len(opts)))
    rnd.shuffle(idx)
    return [opts[i] for i in idx], idx.index(0)

for t, rows in (('risk', G.RISK),):
    for question, opts, cat, expl, src, d in rows:
        o, c = shuffled(opts)
        add(dict(type=t, question=question, options=o, correct=c, category=cat, explanation=expl, source=src, difficulty=d))
for st, ans, cat, expl, src, d in Bc.TF:
    add(dict(type='truefalse', statement=st, answer=ans, category=cat, explanation=expl, source=src, difficulty=d))
for question, opts, c, cat, expl, src, d in Bc.HL:
    add(dict(type='higherlower', question=question, options=opts, correct=c, category=cat, explanation=expl, source=src, difficulty=d))
for question, y, cat, expl, src, d in Bc.YEAR:
    add(dict(type='year', question=question, answer=y, category=cat, explanation=expl, source=src, difficulty=d))
for question, a, unit, cat, expl, src, d in Bc.CLOSEST:
    q = dict(type='closest', question=question, answer=a, category=cat, explanation=expl, source=src, difficulty=d)
    if unit: q['unit'] = unit
    add(q)
for prompt, items, values, cat, expl, src, d in C.ORDER:
    q = dict(type='order', prompt=prompt, items=items, category=cat, explanation=expl, source=src, difficulty=d)
    vals = [v or '–' for v in values]
    if any(values) and len(set(v.lower() for v in vals)) == len(vals): q['values'] = vals
    add(q)
for items, odd, expl, cat, d in C.ODD:
    # uljez ne smije uvijek biti zadnji – premiješaj
    idx = list(range(len(items))); rnd.shuffle(idx)
    its = [items[i] for i in idx]
    add(dict(type='oddone', items=its, odd=idx.index(odd), explanation=expl, category=cat, difficulty=d))
for subject, clues, answer, accept, cat, d in G.DESC:
    q = dict(type='describe', subject=subject, clues=clues, answer=answer, category=cat, difficulty=d)
    if accept: q['accept'] = accept
    add(q)
for prompt, ex in E.LIST3:
    add(dict(type='list3', prompt=prompt, examples=list({e.lower(): e for e in ex}.values()), difficulty=1))
for topic, ex in E.CATEGORY:
    add(dict(type='category', topic=topic, examples=list({e.lower(): e for e in ex}.values()), difficulty=1))
pack = {'format': 'zicer-paket', 'version': 1,
        'pack': {'id': 'zicer-kurirani-3', 'name': 'Zicer – kurirani paket 3', 'author': 'Zicer',
                 'description': 'Treći paket: više kategorija, redoslijeda, uljeza, opisa, riskiranja i činjenica.'},
        'questions': out}
json.dump(pack, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('novih:', len(out), '· odbačeno duplikata:', len(dup))
for d in dup: print('  DUPLIKAT', d)
print(counters)
