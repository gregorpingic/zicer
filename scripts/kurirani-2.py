# Slaže drugi kurirani paket iz scripts/pitanja/*.py i odbacuje duplikate u odnosu na postojeća pitanja.
# Pokretanje: python3 scripts/kurirani-2.py <postojeća pitanja.json> <izlaz.json>
import json, random, re, sys, unicodedata
sys.path.insert(0, __file__.rsplit('/', 1)[0] + '/pitanja')
import a_kviz as A, b_cinjenice as Bc, c_igre as C

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
    q['id'] = f"kur2-{q['type']}-{counters[q['type']]:03d}"
    out.append(q)

def shuffled(opts):
    idx = list(range(len(opts)))
    rnd.shuffle(idx)
    return [opts[i] for i in idx], idx.index(0)

for t, rows in (('quiz', A.QUIZ), ('risk', A.RISK)):
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
    if any(values): q['values'] = [v or '–' for v in values]
    add(q)
for items, odd, expl, cat, d in C.ODD:
    # uljez ne smije uvijek biti zadnji – premiješaj
    idx = list(range(len(items))); rnd.shuffle(idx)
    its = [items[i] for i in idx]
    add(dict(type='oddone', items=its, odd=idx.index(odd), explanation=expl, category=cat, difficulty=d))
for subject, clues, answer, accept, cat, d in C.DESC:
    q = dict(type='describe', subject=subject, clues=clues, answer=answer, category=cat, difficulty=d)
    if accept: q['accept'] = accept
    add(q)
for clues, answer, accept, cat in C.ASSOC:
    q = dict(type='association', clues=clues, answer=answer, difficulty=1)
    if accept: q['accept'] = accept
    if cat: q['category'] = cat
    add(q)
for question, answers in C.FEUD:
    pts = [30, 25, 20, 15, 10]
    ans = []
    for i, a in enumerate(answers):
        text, *acc = a.split('|')
        ans.append({'text': text, 'points': pts[i], **({'accept': acc} if acc else {})})
    add(dict(type='feud', question=question, estimated=True, answers=ans, difficulty=1))
for prompt, ex in C.LIST3:
    add(dict(type='list3', prompt=prompt, examples=ex, difficulty=1))
for topic, ex in C.CATEGORY:
    add(dict(type='category', topic=topic, examples=list(dict.fromkeys(ex)), difficulty=1))
for question in C.KNOWME:
    add(dict(type='knowme', question=question))

pack = {'format': 'zicer-paket', 'version': 1,
        'pack': {'id': 'zicer-kurirani-2', 'name': 'Zicer – kurirani paket 2', 'author': 'Zicer',
                 'description': 'Novih ~950 ručno pisanih pitanja za sve vrste igara.'},
        'questions': out}
json.dump(pack, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('novih:', len(out), '· odbačeno duplikata:', len(dup))
for d in dup: print('  DUPLIKAT', d)
print(counters)
