# Slaže četvrti kurirani paket iz scripts/pitanja4/*.py (samo lokalno – NE učitava se automatski).
# Pokretanje: python3 scripts/kurirani-4.py <postojeća pitanja.json> <izlaz.json>
import json, random, re, sys, unicodedata, importlib
sys.path.insert(0, __file__.rsplit('/', 1)[0] + '/pitanja4')
existing = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
rnd = random.Random(4004)

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
    if t == 'versus':
        return 'vs:' + '|'.join(sorted(norm(p['a']) + norm(p['b']) for p in q['pairs']))
    if t == 'order':
        return 'ord:' + ''.join(norm(x) for x in q['items'])
    return 'txt:' + norm(q.get('question') or q.get('prompt') or q.get('statement') or q.get('topic') or '')

seen = {key(q) for q in existing}
out, dup, counters = [], [], {}

def add(q):
    k = key(q)
    if k in seen:
        dup.append((q['type'], k[:60])); return
    seen.add(k)
    counters[q['type']] = counters.get(q['type'], 0) + 1
    q['id'] = f"kur4-{q['type']}-{counters[q['type']]:04d}"
    out.append(q)

def shuffled(opts):
    idx = list(range(len(opts))); rnd.shuffle(idx)
    return [opts[i] for i in idx], idx.index(0)

def has(mod, name):
    return getattr(mod, name, [])

mods = [importlib.import_module(m) for m in ['i_drustvene', 'j_brojke', 'k_otdb'] + [m for m in sys.argv[3:]]]
for M in mods:
    src = getattr(M, 'SRC', None)
    for row in has(M, 'QUIZ'):
        if len(row) == 5:
            question, opts, cat, expl, d = row; s = src
        else:
            question, opts, cat, expl, s, d = row
        o, c = shuffled(opts)
        add(dict(type='quiz', question=question, options=o, correct=c, category=cat, explanation=expl, source=s, difficulty=d))
    for row in has(M, 'TF'):
        if len(row) == 5:
            st, ans, cat, expl, d = row; s = src
        else:
            st, ans, cat, expl, s, d = row
        add(dict(type='truefalse', statement=st, answer=ans, category=cat, explanation=expl, source=s, difficulty=d))
    for question, opts, c, cat, expl, s, d in has(M, 'HL'):
        add(dict(type='higherlower', question=question, options=opts, correct=c, category=cat, explanation=expl, source=s, difficulty=d))
    for question, y, cat, expl, s, d in has(M, 'YEAR'):
        add(dict(type='year', question=question, answer=y, category=cat, explanation=expl, source=s, difficulty=d))
    for question, a, unit, cat, expl, s, d in has(M, 'CLOSEST'):
        q = dict(type='closest', question=question, answer=a, category=cat, explanation=expl, source=s, difficulty=d)
        if unit: q['unit'] = unit
        add(q)
    for question, opts, cat, expl, s, d in has(M, 'RISK'):
        o, c = shuffled(opts)
        add(dict(type='risk', question=question, options=o, correct=c, category=cat, explanation=expl, source=s, difficulty=d))
    for prompt, items, values, cat, expl, s, d in has(M, 'ORDER'):
        q = dict(type='order', prompt=prompt, items=items, category=cat, explanation=expl, source=s, difficulty=d)
        vals = [v or '–' for v in values]
        if any(values) and len(set(v.lower() for v in vals)) == len(vals): q['values'] = vals
        add(q)
    for items, odd, expl, cat, d in has(M, 'ODD'):
        idx = list(range(len(items))); rnd.shuffle(idx)
        add(dict(type='oddone', items=[items[i] for i in idx], odd=idx.index(odd), explanation=expl, category=cat, difficulty=d))
    for subject, clues, answer, accept, cat, d in has(M, 'DESC'):
        q = dict(type='describe', subject=subject, clues=clues, answer=answer, category=cat, difficulty=d)
        if accept: q['accept'] = accept
        add(q)
    for clues, answer, accept, cat in has(M, 'ASSOC'):
        q = dict(type='association', clues=clues, answer=answer, difficulty=1)
        if accept: q['accept'] = accept
        if cat: q['category'] = cat
        add(q)
    for question, answers in has(M, 'FEUD'):
        pts = [30, 25, 20, 15, 10]; ans = []
        for i, a in enumerate(answers):
            text, *acc = a.split('|')
            ans.append({'text': text, 'points': pts[i], **({'accept': acc} if acc else {})})
        add(dict(type='feud', question=question, estimated=True, answers=ans, difficulty=1))
    for prompt, ex in has(M, 'LIST3'):
        add(dict(type='list3', prompt=prompt, examples=list({e.lower(): e for e in ex}.values()), difficulty=1))
    for topic, ex in has(M, 'CATEGORY'):
        add(dict(type='category', topic=topic, examples=list({e.lower(): e for e in ex}.values()), difficulty=1))
    for prompt, pairs, cat, d in has(M, 'VERSUS'):
        add(dict(type='versus', prompt=prompt, pairs=pairs, category=cat, difficulty=d))
    for question in has(M, 'KNOWME'):
        add(dict(type='knowme', question=question))

pack = {'format': 'zicer-paket', 'version': 1,
        'pack': {'id': 'zicer-kurirani-4', 'name': 'Zicer – kurirani paket 4', 'author': 'Zicer',
                 'description': 'Četvrti paket: vlastita pitanja i pitanja prilagođena iz Open Trivia Database (CC BY-SA 4.0).'},
        'questions': out}
json.dump(pack, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('novih:', len(out), '· odbačeno duplikata:', len(dup))
print(counters)
