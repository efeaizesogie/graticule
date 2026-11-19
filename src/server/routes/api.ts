import { Hono, type Context as HonoContext } from 'hono';
import { context } from '@devvit/web/server';
import { resultText, type ErrorResponse, type SplashState } from '../../shared/api';
import {
  addSuggestion,
  archive,
  castVote,
  currentDay,
  dayForPost,
  dayInfo,
  guess,
  leaderboard,
  me,
  nextDropAt,
  puzzleState,
  shareResult,
  stats,
  voteState,
} from '../core/game';
import { bandsFor } from '../core/bank';

export const api = new Hono();

const fail = (c: HonoContext, message: string, status: 400 | 401 | 404 | 500 = 400) =>
  c.json<ErrorResponse>({ type: 'error', message }, status);

/** The day this post shows; falls back to today for posts made outside the daily job. */
async function postDay(): Promise<number> {
  const fromPost = context.postId ? await dayForPost(context.postId) : undefined;
  return fromPost ?? (await currentDay());
}

const parseN = (raw: string | undefined) => (raw && /^\d+$/.test(raw) ? Number(raw) : undefined);

api.get('/splash', async (c) => {
  const n = await postDay();
  const info = await dayInfo(n);
  if (!info) return fail(c, 'No map yet. A moderator can post one from the subreddit menu.', 404);
  const state = await puzzleState(n);
  const today = await currentDay();
  const body: SplashState = {
    type: 'splash', n, date: info.date, bands: bandsFor(info.dataset), bandCount: info.dataset.thresholds.length + 1,
    players: (await stats(n)).players, me: await me(today),
    game: state && state.game.guesses.length ? state.game : null, nextAt: nextDropAt(),
  };
  return c.json(body);
});

api.get('/state', async (c) => {
  const n = parseN(c.req.query('n')) ?? (await postDay());
  if (n > (await currentDay())) return fail(c, 'That map has not dropped yet', 404);
  const state = await puzzleState(n);
  return state ? c.json(state) : fail(c, 'No map yet', 404);
});

api.post('/guess', async (c) => {
  const { n, choice } = await c.req.json<{ n: number; choice: number }>();
  if (!Number.isInteger(n) || n > (await currentDay())) return fail(c, 'Bad puzzle');
  const r = await guess(n, choice);
  return typeof r === 'string' ? fail(c, r, r.startsWith('Log in') ? 401 : 400) : c.json(r);
});

api.get('/leaderboard', async (c) => {
  const n = parseN(c.req.query('n')) ?? (await postDay());
  return c.json(await leaderboard(n));
});

api.get('/archive', async (c) => c.json({ type: 'archive', items: await archive() }));

api.get('/vote', async (c) => c.json(await voteState()));
api.post('/vote', async (c) => {
  const { theme } = await c.req.json<{ theme: string }>();
  const r = await castVote(String(theme));
  return typeof r === 'string' ? fail(c, r) : c.json(r);
});

api.post('/share', async (c) => {
  const { n } = await c.req.json<{ n: number }>();
  const state = await puzzleState(n);
  if (!state?.game.done) return fail(c, 'Finish the map first');
  try {
    await shareResult(n, `${resultText(n, state.game, state.me.streak)}\n\n*played on Graticule*`);
    return c.json({ ok: true });
  } catch (e) {
    console.error('share failed', e);
    return fail(c, 'Could not post your comment', 500);
  }
});

api.post('/suggest', async (c) => {
  if (!context.userId) return fail(c, 'Log in to suggest a map', 401);
  const { text, source } = await c.req.json<{ text: string; source: string }>();
  if (!text || String(text).trim().length < 4) return fail(c, 'Tell us what the map should show');
  await addSuggestion(String(text).trim(), String(source ?? '').trim());
  return c.json({ ok: true });
});
