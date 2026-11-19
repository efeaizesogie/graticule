// Local preview only: serves dist/client and fakes /api with in-memory state,
// so the UI can be designed and screenshotted without a Reddit playtest.
// Run: npm run build && node tools/mock-server.mjs [port]   (?day=N to switch puzzle, ?fresh to reset)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/client/', import.meta.url));
const STAGE = fileURLToPath(new URL('../video/dist/', import.meta.url)); // demo-video stage, same origin as the game
const bank = JSON.parse(readFileSync(new URL('../src/server/bank.json', import.meta.url), 'utf8'));
const PORT = Number(process.argv[2] ?? 5178);
const MAX = 3;
let today = 6;
let games = {};
const votes = { people: 4, planet: 7, money: 2, health: 3, tech: 5 };
let mine = null;
const date = (n) => new Date(Date.UTC(2026, 11, 1 + n - today)).toISOString().slice(0, 10);

function choicesFor(d, n) {
  const items = [d.answer, ...d.decoys];
  let seed = (n * 2654435761 + d.id.length * 97) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
const bandsFor = (d) => Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, d.thresholds.filter((t) => v >= t).length]));
const nextAt = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };
const me = () => ({ username: 'mapreader', loggedIn: true, streak: 4, best: 9, played: 12 });

function state(n) {
  const d = bank[(n - 1) % bank.length];
  const g = games[n] ?? { guesses: [], solved: false, done: false };
  const wrong = g.guesses.length - (g.solved ? 1 : 0);
  const w = g.done ? MAX : wrong;
  const hints = {};
  if (w >= 1) hints.extremes = { top: d.top[0], bottom: d.bottom[0] };
  if (w >= 2) hints.unit = d.unit;
  const s = {
    type: 'state', n, date: date(n), isToday: n === today, bands: bandsFor(d), bandCount: d.thresholds.length + 1,
    choices: choicesFor(d, n), game: g, hints, stats: { players: 1284, dist: [512, 401, 188, 116] }, me: me(), nextAt: nextAt(),
  };
  if (g.done) s.reveal = { answer: d.answer, indicator: d.indicatorName, unit: d.unit, year: d.year, fact: d.fact, category: d.cat, source: d.source, top: d.top, bottom: d.bottom, values: d.values };
  return s;
}

function api(path, q, body) {
  if (path === '/splash') { const s = state(today); return { type: 'splash', n: today, date: s.date, bands: s.bands, bandCount: s.bandCount, players: 1284, me: me(), game: games[today]?.guesses.length ? games[today] : null, nextAt: nextAt() }; }
  if (path === '/state') return state(Number(q.get('n') ?? today));
  if (path === '/guess') {
    const s = state(body.n);
    const g = (games[body.n] ??= { guesses: [], solved: false, done: false });
    if (!g.done && !g.guesses.includes(body.choice)) {
      g.guesses.push(body.choice);
      if (s.choices[body.choice] === bank[(body.n - 1) % bank.length].answer) g.solved = true;
      if (g.solved || g.guesses.length >= MAX) g.done = true;
    }
    return state(body.n);
  }
  if (path === '/leaderboard') return { type: 'leaderboard', n: today, myRank: 3, today: ['geo_nerd', 'atlasandy', 'mapreader', 'lagos_lat', 'mercatorphobe'].map((u, i) => ({ rank: i + 1, username: u, value: 0, tries: i < 2 ? 1 : 2, seconds: 23 + i * 31 })), streaks: ['atlasandy', 'geo_nerd', 'mapreader'].map((u, i) => ({ rank: i + 1, username: u, value: 21 - i * 6 })) };
  if (path === '/archive') return { type: 'archive', items: Array.from({ length: today }, (_, i) => { const n = today - i; const g = games[n]; const d = bank[(n - 1) % bank.length]; return { n, date: date(n), result: g ?? null, ...(g?.done ? { answer: d.answer, category: d.cat } : {}) }; }) };
  if (path === '/vote') { if (body?.theme) mine = body.theme; const ids = ['planet', 'money', 'tech']; return { type: 'vote', forN: today + 1, mine, options: ids.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), votes: votes[id] + (mine === id ? 1 : 0) })) }; }
  if (path === '/share' || path === '/suggest') return { ok: true };
  return { type: 'error', message: 'unknown' };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.has('day')) today = Number(url.searchParams.get('day'));
  if (url.searchParams.has('fresh')) { games = {}; mine = null; }
  if (url.pathname.startsWith('/api/')) {
    let body = null;
    if (req.method === 'POST') { let raw = ''; for await (const c of req) raw += c; body = JSON.parse(raw || '{}'); }
    const out = api(url.pathname.slice(4), url.searchParams, body);
    res.writeHead(out.type === 'error' ? 400 : 200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(out));
  }
  const file = url.pathname.startsWith('/stage/') ? join(STAGE, url.pathname.slice(7) || 'index.html') : join(ROOT, url.pathname === '/' ? 'splash.html' : url.pathname);
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`mock: http://localhost:${PORT}/  (game: /game.html)`));
