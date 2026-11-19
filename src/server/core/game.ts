import { context, reddit, redis } from '@devvit/web/server';
import {
  MAX_TRIES,
  THEMES,
  type ArchiveItem,
  type Hints,
  type LeaderRow,
  type Me,
  type MyGame,
  type PuzzleState,
  type Reveal,
  type Stats,
  type VoteState,
} from '../../shared/api';
import { BANK, bandsFor, choicesFor, datasetById, themeOf, type Dataset } from './bank';

// ---------- keys ----------
const K = {
  day: 'meta:day', // current day number
  used: 'meta:used', // hash datasetId -> day n
  dayInfo: (n: number) => `day:${n}`, // hash { dataset, postId, date }
  postDay: (postId: string) => `post:${postId}`,
  game: (n: number, userId: string) => `g:${n}:${userId}`,
  stats: (n: number) => `st:${n}`,
  lb: (n: number) => `lb:${n}`,
  lbStreak: 'lb:streak',
  user: (userId: string) => `u:${userId}`,
  votes: (n: number) => `vote:${n}`,
  voted: (n: number) => `voted:${n}`,
  suggestions: 'suggest',
};

export type DayInfo = { n: number; dataset: Dataset; postId: string | undefined; date: string };

export async function currentDay(): Promise<number> {
  return Number((await redis.get(K.day)) ?? 0);
}

export async function dayInfo(n: number): Promise<DayInfo | undefined> {
  const h = await redis.hGetAll(K.dayInfo(n));
  const dataset = h.dataset ? datasetById(h.dataset) : undefined;
  if (!dataset) return undefined;
  return { n, dataset, postId: h.postId, date: h.date ?? '' };
}

export async function dayForPost(postId: string): Promise<number | undefined> {
  const v = await redis.get(K.postDay(postId));
  return v ? Number(v) : undefined;
}

export function nextDropAt(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

// ---------- choosing tomorrow's map ----------
function voteOptions(n: number, exclude: string): { id: string; label: string }[] {
  const pool = THEMES.filter((t) => t.id !== exclude);
  const start = n % pool.length;
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length]!);
}

async function pickDataset(n: number): Promise<Dataset> {
  const used = await redis.hGetAll(K.used);
  let fresh = BANK.filter((d) => !(d.id in used));
  if (fresh.length === 0) {
    // the bank has cycled: start again, oldest first
    await redis.del(K.used);
    fresh = [...BANK];
  }
  const votes = await redis.zRange(K.votes(n), 0, 0, { by: 'rank', reverse: true });
  const winner = votes[0]?.member;
  if (winner) {
    const match = fresh.find((d) => themeOf(d) === winner);
    if (match) return match;
  }
  return fresh[0]!;
}

/** Open day n+1: choose its dataset and create its post. */
export async function openNextDay(): Promise<DayInfo> {
  const n = (await currentDay()) + 1;
  const dataset = await pickDataset(n);
  const date = new Date().toISOString().slice(0, 10);
  const num = String(n).padStart(3, '0');
  const post = await reddit.submitCustomPost({
    title: `Graticule N°${num}: what does this map measure?`,
    entry: 'default',
    postData: { n },
    textFallback: {
      text: [
        `# Graticule N°${num}`,
        "Today's mystery world map has no title and no legend. Every country is shaded by one real statistic. Work out what it measures.",
        'You see which countries have the most and the least. Pick from four answers, with three tries. A wrong guess reveals the unit, and a second one gives an everyday nudge.',
        'The answer, its source and one surprising fact appear when you finish. A new map drops every day at 00:00 UTC.',
      ].join('\n\n'),
    },
  });
  await Promise.all([
    redis.hSet(K.dayInfo(n), { dataset: dataset.id, postId: post.id, date }),
    redis.set(K.postDay(post.id), String(n)),
    redis.hSet(K.used, { [dataset.id]: String(n) }),
    redis.set(K.day, String(n)),
  ]);
  try {
    const c = await reddit.submitComment({
      id: post.id,
      text: [
        `**Theories thread for N°${num}.** Darker = more. What do you think the colours show, and why?`,
        'Please wrap answers in spoiler tags like `>!this!<` so you don\'t ruin it for anyone. The real answer and its source appear in the post once you finish.',
        "*Want to steer tomorrow's map? Vote for a theme after you play.*",
      ].join('\n\n'),
    });
    await c.distinguish(true);
  } catch (e) {
    console.error('seed comment failed', e);
  }
  return { n, dataset, postId: post.id, date };
}

// ---------- per-user ----------
type UserRec = { streak: number; best: number; last: number; played: number };

async function userRec(userId: string): Promise<UserRec> {
  const h = await redis.hGetAll(K.user(userId));
  return { streak: Number(h.streak ?? 0), best: Number(h.best ?? 0), last: Number(h.last ?? 0), played: Number(h.played ?? 0) };
}

export async function me(today: number): Promise<Me> {
  const { userId } = context;
  const username = (await reddit.getCurrentUsername()) ?? null;
  if (!userId) return { username, loggedIn: false, streak: 0, best: 0, played: 0 };
  const r = await userRec(userId);
  // a streak survives only if you played yesterday or today
  const alive = r.last >= today - 1;
  return { username, loggedIn: true, streak: alive ? r.streak : 0, best: r.best, played: r.played };
}

type GameRec = MyGame & { startedAt: number; finishedAt?: number };

async function loadGame(n: number, userId: string | undefined): Promise<GameRec | null> {
  if (!userId) return null;
  const raw = await redis.get(K.game(n, userId));
  return raw ? (JSON.parse(raw) as GameRec) : null;
}

async function saveGame(n: number, userId: string, g: GameRec) {
  await redis.set(K.game(n, userId), JSON.stringify(g));
}

export async function stats(n: number): Promise<Stats> {
  const h = await redis.hGetAll(K.stats(n));
  const v = (k: string) => Number(h[k] ?? 0);
  return { players: v('p'), dist: [v('d1'), v('d2'), v('d3'), v('dx')] };
}

function hintsFor(d: Dataset, wrong: number): Hints {
  const h: Hints = { most: d.clueTop, least: d.clueBottom };
  if (wrong >= 1) h.unit = d.unit;
  if (wrong >= 2) h.nudge = d.nudge;
  return h;
}

function revealFor(d: Dataset): Reveal {
  return {
    answer: d.answer, indicator: d.indicatorName, unit: d.unit, year: d.year, fact: d.fact, category: d.cat, source: d.source,
    top: d.top, bottom: d.bottom, values: d.values,
  };
}

const emptyGame = (): MyGame => ({ guesses: [], solved: false, done: false });

export async function puzzleState(n: number): Promise<PuzzleState | undefined> {
  const info = await dayInfo(n);
  if (!info) return undefined;
  const today = await currentDay();
  const { userId } = context;
  let g = await loadGame(n, userId);
  if (userId && !g) {
    // start the clock on first view; nothing counts as "played" until a guess
    g = { ...emptyGame(), startedAt: Date.now() };
    await saveGame(n, userId, g);
  }
  const game: MyGame = g ? { guesses: g.guesses, solved: g.solved, done: g.done } : emptyGame();
  const wrong = game.guesses.length - (game.solved ? 1 : 0);
  const d = info.dataset;
  const state: PuzzleState = {
    type: 'state', n, date: info.date, isToday: n === today,
    bands: bandsFor(d), bandCount: d.thresholds.length + 1,
    choices: choicesFor(d, n), game, hints: hintsFor(d, game.done ? MAX_TRIES : wrong),
    stats: await stats(n), me: await me(today), nextAt: nextDropAt(),
  };
  if (game.done) state.reveal = revealFor(d);
  return state;
}

export async function guess(n: number, choice: number): Promise<PuzzleState | string> {
  const { userId } = context;
  if (!userId) return 'Log in to play';
  const info = await dayInfo(n);
  if (!info) return 'No such puzzle';
  const today = await currentDay();
  const choices = choicesFor(info.dataset, n);
  if (!Number.isInteger(choice) || choice < 0 || choice >= choices.length) return 'Bad choice';
  const g = (await loadGame(n, userId)) ?? { ...emptyGame(), startedAt: Date.now() };
  if (g.done) return (await puzzleState(n))!;
  if (g.guesses.includes(choice)) return 'Already tried that one';

  g.guesses.push(choice);
  const correct = choices[choice] === info.dataset.answer;
  if (correct) g.solved = true;
  if (correct || g.guesses.length >= MAX_TRIES) {
    g.done = true;
    g.finishedAt = Date.now();
    await finish(n, today, userId, g);
  }
  await saveGame(n, userId, g);
  return (await puzzleState(n))!;
}

async function finish(n: number, today: number, userId: string, g: GameRec) {
  const tries = g.guesses.length;
  await redis.hIncrBy(K.stats(n), 'p', 1);
  await redis.hIncrBy(K.stats(n), g.solved ? `d${tries}` : 'dx', 1);
  const username = (await reddit.getCurrentUsername()) ?? 'anon';
  if (g.solved) {
    const seconds = Math.min(99_999, Math.round(((g.finishedAt ?? Date.now()) - g.startedAt) / 1000));
    await redis.zAdd(K.lb(n), { member: username, score: tries * 100_000 + seconds });
  }
  const r = await userRec(userId);
  const upd: Record<string, string> = { played: String(r.played + 1) };
  // Streaks only count today's map, so the archive can't be farmed.
  if (n === today) {
    const streak = g.solved ? (r.last === n - 1 ? r.streak + 1 : r.last === n ? r.streak : 1) : 0;
    upd.streak = String(streak);
    upd.best = String(Math.max(r.best, streak));
    upd.last = String(n);
    if (streak > 0) await redis.zAdd(K.lbStreak, { member: username, score: streak });
    else await redis.zRem(K.lbStreak, [username]);
    if (streak >= 2) await setStreakFlair(username, streak);
  }
  await redis.hSet(K.user(userId), upd);
}

async function setStreakFlair(username: string, streak: number) {
  const subredditName = context.subredditName;
  if (!subredditName) return;
  try {
    await reddit.setUserFlair({ subredditName, username, text: `▲ ${streak}-day streak`, backgroundColor: '#0f0e12', textColor: 'light' });
  } catch (e) {
    console.warn('flair skipped', e);
  }
}

// ---------- boards ----------
export async function leaderboard(n: number) {
  const top = await redis.zRange(K.lb(n), 0, 9, { by: 'rank' });
  const today: LeaderRow[] = top.map((r, i) => ({
    rank: i + 1, username: r.member, value: r.score, tries: Math.floor(r.score / 100_000), seconds: r.score % 100_000,
  }));
  const st = await redis.zRange(K.lbStreak, 0, 9, { by: 'rank', reverse: true });
  const streaks: LeaderRow[] = st.map((r, i) => ({ rank: i + 1, username: r.member, value: r.score }));
  const username = await reddit.getCurrentUsername();
  let myRank: number | null = null;
  if (username) {
    const rk = await redis.zRank(K.lb(n), username);
    myRank = rk === undefined || rk === null ? null : rk + 1;
  }
  return { type: 'leaderboard' as const, n, today, streaks, myRank };
}

export async function archive(): Promise<ArchiveItem[]> {
  const today = await currentDay();
  const { userId } = context;
  const items: ArchiveItem[] = [];
  for (let n = today; n >= 1 && items.length < 60; n--) {
    const info = await dayInfo(n);
    if (!info) continue;
    const g = await loadGame(n, userId);
    const result = g && g.guesses.length ? { guesses: g.guesses, solved: g.solved, done: g.done } : null;
    const item: ArchiveItem = { n, date: info.date, result };
    if (result?.done) {
      item.answer = info.dataset.answer;
      item.category = info.dataset.cat;
    }
    items.push(item);
  }
  return items;
}

// ---------- tomorrow's theme ----------
export async function voteState(): Promise<VoteState> {
  const today = await currentDay();
  const info = await dayInfo(today);
  const forN = today + 1;
  const opts = voteOptions(forN, info ? themeOf(info.dataset) : '');
  const scores = await Promise.all(opts.map((o) => redis.zScore(K.votes(forN), o.id)));
  const mine = context.userId ? ((await redis.hGet(K.voted(forN), context.userId)) ?? null) : null;
  return { type: 'vote', forN, mine, options: opts.map((o, i) => ({ ...o, votes: Number(scores[i] ?? 0) })) };
}

export async function castVote(theme: string): Promise<VoteState | string> {
  const { userId } = context;
  if (!userId) return 'Log in to vote';
  const st = await voteState();
  if (!st.options.some((o) => o.id === theme)) return 'Not an option today';
  const prev = await redis.hGet(K.voted(st.forN), userId);
  if (prev === theme) return st;
  if (prev) await redis.zIncrBy(K.votes(st.forN), prev, -1);
  await redis.zIncrBy(K.votes(st.forN), theme, 1);
  await redis.hSet(K.voted(st.forN), { [userId]: theme });
  return voteState();
}

// ---------- community suggestions (reviewed by mods before use) ----------
export async function addSuggestion(text: string, source: string) {
  const username = (await reddit.getCurrentUsername()) ?? 'anon';
  const entry = JSON.stringify({ username, text: text.slice(0, 200), source: source.slice(0, 300), at: Date.now() });
  await redis.zAdd(K.suggestions, { member: entry, score: Date.now() });
}

export async function latestSuggestions(limit = 10) {
  const rows = await redis.zRange(K.suggestions, 0, limit - 1, { by: 'rank', reverse: true });
  return rows.map((r) => JSON.parse(r.member) as { username: string; text: string; source: string; at: number });
}

export async function shareResult(n: number, text: string) {
  const info = await dayInfo(n);
  const postId = info?.postId ?? context.postId;
  if (!postId) throw new Error('no post');
  await reddit.submitComment({ id: postId as `t3_${string}`, text, runAs: 'USER' });
}
