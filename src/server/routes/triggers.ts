import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import type { TriggerResponse } from '@devvit/web/shared';
import { currentDay, openNextDay } from '../core/game';

export const triggers = new Hono();

// First install: post map N°001 straight away so the subreddit is never empty.
triggers.post('/on-app-install', async (c) => {
  try {
    if ((await currentDay()) === 0) await openNextDay();
    return c.json<TriggerResponse>({ status: 'success', message: 'Graticule installed' });
  } catch (error) {
    console.error(`install post failed: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to create first post' }, 400);
  }
});

export const scheduler = new Hono();

// 00:00 UTC every day: a new map.
scheduler.post('/daily', async (c) => {
  try {
    const day = await openNextDay();
    console.log(`daily map N°${day.n}: ${day.dataset.id}`);
    return c.json<TaskResponse>({ status: 'ok' });
  } catch (error) {
    console.error(`daily post failed: ${error}`);
    return c.json<TaskResponse>({ status: 'error' } as unknown as TaskResponse, 500);
  }
});
