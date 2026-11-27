# Slaže paket "Pogodi cijenu" iz scripts/pitanja/d_cijene.py.  python3 scripts/cijene-paket.py <izlaz.json>
import json, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0] + '/pitanja')
from d_cijene import PRICES, HR
qs = []
for i, (item, details, price, expl, d, src) in enumerate(PRICES, 1):
    q = {'id': f'cij-{i:03d}', 'type': 'price', 'category': 'Cijene', 'difficulty': d, 'item': item,
         'answer': price, 'explanation': expl, 'source': src or HR}
    if details: q['details'] = details
    qs.append(q)
json.dump({'format': 'zicer-paket', 'version': 1,
           'pack': {'id': 'zicer-cijene', 'name': 'Pogodi cijenu', 'author': 'Zicer', 'description': 'Okvirne cijene artikala i usluga (Hrvatska, 2025.).'},
           'questions': qs}, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
print('artikala:', len(qs))
