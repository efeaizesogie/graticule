// Build the game's data from data/raw (World Bank) + world-atlas (Natural Earth).
//   src/shared/world.json      – Natural Earth 1:110m countries keyed by ISO3, Antarctica removed,
//                                plus dots for countries too small to appear at that scale.
//   src/shared/countries.json  – ISO3 -> display name
//   src/server/bank.json       – the puzzles, in daily order
// Run: node tools/data/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoCentroid, geoArea } from 'd3-geo';
import countriesLib from 'i18n-iso-countries';
import { INDICATORS } from './indicators.mjs';
import { FACTS, NAMES, NUDGES } from './facts.mjs';

const require = createRequire(import.meta.url);
const raw = (f) => JSON.parse(readFileSync(new URL(`../../data/raw/${f}`, import.meta.url), 'utf8'));
const out = (p, o) => writeFileSync(new URL(`../../${p}`, import.meta.url), JSON.stringify(o));

// ---------- world ----------
const SPECIAL = { Kosovo: 'XKX', 'N. Cyprus': 'CYN', Somaliland: 'SOM' };
const iso = (g) => SPECIAL[g.properties.name] ?? countriesLib.numericToAlpha3(g.id);
const w110 = structuredClone(require('world-atlas/countries-110m.json'));
w110.objects.countries.geometries = w110.objects.countries.geometries
  .filter((g) => g.id !== '010')
  .map((g) => ({ type: g.type, arcs: g.arcs, id: iso(g) ?? `X${g.id}` }));
delete w110.objects.land;
const present = new Set(w110.objects.countries.geometries.map((g) => g.id));
// size of each visible country, used to break ties in the clues (big, recognisable countries first)
const AREA = {};
for (const f of feature(w110, w110.objects.countries).features) AREA[f.id] = (AREA[f.id] ?? 0) + geoArea(f);

const wbNames = raw('countries.json');
const names = Object.fromEntries(Object.entries(wbNames).map(([k, v]) => [k, NAMES[k] ?? v]));
names.TWN = 'Taiwan'; names.ESH = 'Western Sahara'; names.CYN = 'Northern Cyprus';
names.FLK = 'Falkland Islands'; names.ATF = 'French Southern Lands'; names.NCL ??= 'New Caledonia';

const w50 = require('world-atlas/countries-50m.json');
const f50 = feature(w50, w50.objects.countries).features;
const dots = [];
for (const f of f50) {
  const id = countriesLib.numericToAlpha3(f.id);
  if (!id || present.has(id) || !wbNames[id]) continue;
  const [lon, lat] = geoCentroid(f);
  dots.push([id, +lon.toFixed(2), +lat.toFixed(2)]);
}
out('src/shared/world.json', { topo: w110, dots });
out('src/shared/countries.json', names);
console.log(`world: ${present.size} shapes, ${dots.length} dots`);

// ---------- bank ----------
const fmt = (v) => {
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
};
const sig = (v) => +v.toPrecision(4);

function quantileThresholds(vals, k = 7) {
  const s = [...vals].sort((a, b) => a - b);
  const t = [];
  for (let i = 1; i < k; i++) t.push(s[Math.floor((i / k) * s.length)]);
  // collapse duplicates (e.g. many countries at exactly 100%)
  return [...new Set(t.map(sig))];
}

// Daily order: easy openers, then mix categories so no two days feel alike.
const ORDER = ['internet', 'life-exp', 'forest', 'density', 'gdp-pc', 'male-share', 'fertility', 'urban', 'co2', 'over-65',
  'electricity-access', 'migrants', 'tourism', 'under-15', 'pm25', 'mobile', 'fuel-exports', 'women-work', 'clean-water', 'military',
  'pop-growth', 'arable', 'unemployment'];
const byId = Object.fromEntries(INDICATORS.map((i) => [i.id, i]));
if (ORDER.length !== INDICATORS.length || ORDER.some((id) => !byId[id])) throw new Error('ORDER out of sync with INDICATORS');

const bank = ORDER.map((id, idx) => {
  const ind = byId[id];
  if (ind.decoys.length !== 3 || new Set([ind.answer, ...ind.decoys]).size !== 4) throw new Error(`${id}: need 3 distinct decoys`);
  const r = raw(`${id}.json`);
  const values = {};
  for (const [k, v] of Object.entries(r.values)) {
    if (ind.dropZero && v === 0) continue;
    values[k] = sig(v);
  }
  const vals = Object.values(values);
  const n = vals.length;
  const thresholds = ind.diverging ? [-1, -0.25, 0.25, 1, 2, 3] : quantileThresholds(vals);
  const fact = FACTS[id].replace(/\{([^}]+)\}/g, (_, tok) => {
    if (tok === 'n') return String(n);
    const m = tok.match(/^count([<>])(-?[\d.]+)$/);
    if (m) return String(vals.filter((v) => (m[1] === '>' ? v > +m[2] : v < +m[2])).length);
    if (!(tok in values)) throw new Error(`fact for ${id} cites ${tok}, which has no data`);
    return fmt(values[tok]);
  });
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  // Clues shown from the start: countries big enough to see on the map.
  const visible = Object.entries(values).filter(([k]) => present.has(k));
  const byTop = [...visible].sort((a, b) => b[1] - a[1] || (AREA[b[0]] ?? 0) - (AREA[a[0]] ?? 0));
  const byBottom = [...visible].sort((a, b) => a[1] - b[1] || (AREA[b[0]] ?? 0) - (AREA[a[0]] ?? 0));
  const clueTop = byTop.slice(0, 3).map(([k]) => k);
  const clueBottom = byBottom.slice(0, 3).map(([k]) => k);
  if (!NUDGES[id]) throw new Error(`no nudge for ${id}`);
  const org = (r.sourceOrganization ?? '').replace(/\s+/g, ' ').trim();
  return {
    n: idx + 1, id, answer: ind.answer, decoys: ind.decoys, unit: ind.unit, cat: ind.diverging ? 'diverging' : ind.cat,
    year: r.year, code: ind.code, indicatorName: r.name,
    source: { name: 'World Bank, World Development Indicators', org: org.length > 160 ? org.slice(0, 157) + '…' : org,
      url: `https://data.worldbank.org/indicator/${ind.code}`, license: 'CC BY 4.0' },
    thresholds, values, fact, count: n, clueTop, clueBottom, nudge: NUDGES[id],
    top: sorted.slice(0, 3).map(([k, v]) => [k, v]), bottom: sorted.slice(-3).reverse().map(([k, v]) => [k, v]),
  };
});
out('src/server/bank.json', bank);
for (const b of bank) console.log(`#${b.n} ${b.id} n=${b.count} y=${b.year} bands=${b.thresholds.length + 1}\n   ${b.fact}`);
