// Generira paket „Pogodi po slici”: zastave (flag-icons, MIT) i obrisi država (Natural Earth putem world-atlas, javno vlasništvo).
// Slike se kopiraju/generiraju u public/slike/, a pitanja u paketi/zicer-slike.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { geoAzimuthalEqualArea, geoPath, geoCentroid, geoArea, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
const root = path.resolve(import.meta.dirname, '..');
const hr = new Intl.DisplayNames('hr', { type: 'region' });

const RENAME = { US: 'SAD', GB: 'Ujedinjeno Kraljevstvo', BA: 'Bosna i Hercegovina', CD: 'DR Kongo', CG: 'Kongo', VA: 'Vatikan', CF: 'Srednjoafrička Republika', DO: 'Dominikanska Republika', MM: 'Mjanmar', CI: 'Obala Bjelokosti', CV: 'Zelenortski Otoci', SZ: 'Esvatini', TL: 'Istočni Timor', PS: 'Palestina', KN: 'Sveti Kristofor i Nevis', VC: 'Sveti Vincent i Grenadini', ST: 'Sveti Toma i Princip', FM: 'Mikronezija' };
const name = (c) => RENAME[c] || hr.of(c);

const T1 = 'HR SI BA RS ME MK AL HU AT IT DE FR ES PT GB IE NL BE CH PL CZ SK GR TR SE NO FI DK IS RU UA US CA MX BR AR JP CN KR IN AU EG ZA CU JM'.split(' ');
const T2 = 'RO BG MD BY LT LV EE LU MT CY MC LI SM AD VA XK GE AM AZ KZ SA AE IR IQ SY LB JO IL QA MA DZ TN LY NG KE ET GH SN CM CO PE CL VE UY PY BO EC TH VN ID PH MY SG PK BD NP LK NZ MN KP AF TW PA CR DO HT GT'.split(' ');
// Sve članice UN-a (+ Kosovo, Tajvan, Vatikan, Palestina) – ostatak je razina 3.
const ALL = `AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW XK TW VA PS`.split(' ');
const tier = (c) => (T1.includes(c) ? 1 : T2.includes(c) ? 2 : 3);
const MICRO = 'MC LI SM AD VA MT SG LU BH'.split(' ');

// ---- geografija (središta država za odabir susjednih, sličnih odgovora) ----
const topo = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'));
const geo = feature(topo, topo.objects.countries).features;
const byCode = new Map();
for (const f of geo) {
  let c = f.id && iso.numericToAlpha2(f.id);
  if (!c && f.properties.name === 'Kosovo') c = 'XK';
  if (!c && /Taiwan/.test(f.properties.name)) c = 'TW';
  if (c && ALL.includes(c)) byCode.set(c, f);
}
const centroid = (c) => (byCode.get(c) ? geoCentroid(byCode.get(c)) : null);

// Mikrodržave bez geometrije: ručna središta.
const MANUAL = { MC: [7.42, 43.74], VA: [12.45, 41.9], SM: [12.46, 43.94], LI: [9.55, 47.16], AD: [1.52, 42.5], MT: [14.4, 35.9], SG: [103.8, 1.35], TV: [179.2, -8.5], NR: [166.9, -0.5], MH: [171, 7.1], PW: [134.5, 7.5], KI: [-157, 1.9], MV: [73.5, 4.2], BH: [50.55, 26.07], SC: [55.45, -4.6], KN: [-62.75, 17.3], LC: [-61, 13.9], VC: [-61.2, 13.25], GD: [-61.7, 12.1], DM: [-61.37, 15.4], AG: [-61.8, 17.07], BB: [-59.55, 13.15], TO: [-175.2, -21.2], WS: [-172.1, -13.7], ST: [6.6, 0.3], KM: [43.3, -11.7], MU: [57.55, -20.25], CV: [-23.6, 15.1], FM: [158.2, 6.9] };
const cent = (c) => centroid(c) || MANUAL[c];

const rand = (() => { let s = 20261127; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function distractors(c, pool, n = 3) {
  const p0 = cent(c);
  const cands = pool.filter((x) => x !== c && cent(x));
  const sorted = cands.sort((a, b) => geoDistance(p0, cent(a)) - geoDistance(p0, cent(b)));
  // 3 od 6 najbližih – slične zastave/obrisi u istoj regiji, ali ne uvijek isti
  return shuffle(sorted.slice(0, 6)).slice(0, n);
}

function question(id, c, q, image, pool, difficulty, category, explanation) {
  const opts = shuffle([c, ...distractors(c, pool)]);
  return { id, type: 'picture', difficulty, category, question: q, image, options: opts.map(name), correct: opts.indexOf(c), ...(explanation ? { explanation } : {}) };
}

const out = [];
const flagDir = path.join(root, 'public/slike/zastave');
const shapeDir = path.join(root, 'public/slike/obrisi');
fs.mkdirSync(flagDir, { recursive: true });
fs.mkdirSync(shapeDir, { recursive: true });

// ---- zastave ----
for (const c of ALL) {
  const src = path.join(root, 'node_modules/flag-icons/flags/4x3', `${c.toLowerCase()}.svg`);
  if (!fs.existsSync(src) || !cent(c)) { console.warn('bez zastave', c); continue; }
  fs.copyFileSync(src, path.join(flagDir, `${c.toLowerCase()}.svg`));
  const t = tier(c);
  const pool = ALL.filter((x) => tier(x) <= Math.max(2, t) && cent(x));
  out.push(question(`slike-zastava-${c.toLowerCase()}`, c, 'Čija je ovo zastava?', `slike/zastave/${c.toLowerCase()}.svg`, pool, t, 'Zastave'));
}

// ---- obrisi (samo poznatije, nemikro države) ----
const W = 300, H = 300;
function mainland(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const polys = f.geometry.coordinates.map((coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates } }));
  const areas = polys.map(geoArea);
  const big = polys[areas.indexOf(Math.max(...areas))];
  const c0 = geoCentroid(big);
  const keep = polys.filter((p, i) => areas[i] >= Math.max(...areas) * 0.003 && geoDistance(geoCentroid(p), c0) * 6371 < 1600);
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.geometry.coordinates) } };
}
const shapeCodes = [...T1, ...T2].filter((c) => !MICRO.includes(c) && byCode.has(c));
for (const c of shapeCodes) {
  const f = mainland(byCode.get(c));
  const [lon, lat] = geoCentroid(f);
  const proj = geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[10, 10], [W - 10, H - 10]], f);
  const d = geoPath(proj).digits(1)(f);
  fs.writeFileSync(path.join(shapeDir, `${c.toLowerCase()}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="#f5b82e" stroke="#ffe2a0" stroke-width="1.2" stroke-linejoin="round"/></svg>`);
  const pool = shapeCodes;
  out.push(question(`slike-obris-${c.toLowerCase()}`, c, 'Koja je ovo država?', `slike/obrisi/${c.toLowerCase()}.svg`, pool, Math.min(3, tier(c) + 1), 'Obrisi država', 'Obris nije u mjerilu; manji udaljeni otoci i prekomorski dijelovi su izostavljeni.'));
}

const pack = { format: 'zicer-paket', version: 1, pack: { id: 'zicer-slike', name: 'Pogodi po slici – zastave i obrisi', author: 'Zicer', description: 'Zastave: flag-icons (MIT). Obrisi: Natural Earth (javno vlasništvo).' }, questions: out };
fs.mkdirSync(path.join(root, 'paketi'), { recursive: true });
fs.writeFileSync(path.join(root, 'paketi/zicer-slike.json'), JSON.stringify(pack, null, 1));
console.log('pitanja', out.length, 'zastave', out.filter((q) => q.category === 'Zastave').length, 'obrisi', out.filter((q) => q.category !== 'Zastave').length);
