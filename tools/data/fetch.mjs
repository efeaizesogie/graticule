// Fetch every indicator from the World Bank API into data/raw/<id>.json.
// Run: node tools/data/fetch.mjs   (re-run only when refreshing the bank)
import { mkdirSync, writeFileSync } from 'node:fs';
import { INDICATORS } from './indicators.mjs';

const OUT = new URL('../../data/raw/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const WB = 'https://api.worldbank.org/v2';

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      console.warn(r.status, url);
    } catch (e) { console.warn(String(e), url); }
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error('failed ' + url);
}

const [, countries] = await get(`${WB}/country?format=json&per_page=400`);
const real = new Map(countries.filter((c) => c.region.id !== 'NA').map((c) => [c.id, c.name]));
writeFileSync(new URL('countries.json', OUT), JSON.stringify(Object.fromEntries(real), null, 1));

let pop = null;
async function population() {
  if (pop) return pop;
  const [, rows] = await get(`${WB}/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000&mrnev=1`);
  pop = Object.fromEntries(rows.filter((r) => real.has(r.countryiso3code)).map((r) => [r.countryiso3code, r.value]));
  return pop;
}

for (const ind of INDICATORS) {
  const [, meta] = await get(`${WB}/indicator/${ind.code}?format=json`);
  const [, rows] = await get(`${WB}/country/all/indicator/${ind.code}?format=json&per_page=20000&${ind.date ? 'date=' + ind.date : 'mrnev=1'}`);
  const latest = Math.max(...(rows ?? []).filter((r) => r.value != null).map((r) => Number(r.date)));
  const values = {};
  const years = {};
  for (const r of rows ?? []) {
    if (!real.has(r.countryiso3code) || r.value == null) continue;
    if (Number(r.date) < latest - 10) continue; // too stale to sit beside this year's data
    let v = r.value;
    if (ind.perCapita) {
      const p = (await population())[r.countryiso3code];
      if (!p) continue;
      v = v / p;
    }
    values[r.countryiso3code] = v;
    years[r.countryiso3code] = Number(r.date);
  }
  const ys = Object.values(years).sort((a, b) => a - b);
  const year = ys[Math.floor(ys.length / 2)];
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const m = meta?.[0] ?? {};
  writeFileSync(new URL(`${ind.id}.json`, OUT), JSON.stringify({
    id: ind.id, code: ind.code, name: m.name, sourceOrganization: m.sourceOrganization, sourceNote: m.sourceNote,
    n: sorted.length, year, yearRange: [ys[0], ys.at(-1)], values, years,
  }, null, 1));
  const fmt = ([k, v]) => `${real.get(k)} ${v.toFixed(2)}`;
  console.log(`\n## ${ind.id} (${m.name}) n=${sorted.length} year~${year} [${ys[0]}-${ys.at(-1)}]`);
  console.log('  top:', sorted.slice(0, 6).map(fmt).join(' | '));
  console.log('  bottom:', sorted.slice(-4).map(fmt).join(' | '));
  const pick = ['NGA', 'USA', 'CHN', 'IND', 'GBR', 'BRA'].filter((k) => k in values).map((k) => fmt([k, values[k]]));
  console.log('  ref:', pick.join(' | '));
}
