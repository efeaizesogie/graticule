import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { latestSuggestions, openNextDay } from '../core/game';

export const menu = new Hono();

menu.post('/post-next', async (c) => {
  try {
    const day = await openNextDay();
    return c.json<UiResponse>({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${day.postId}` });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create the map post' }, 400);
  }
});

menu.post('/suggestions', async (c) => {
  const rows = await latestSuggestions(10);
  const text = rows.length
    ? rows.map((r) => `u/${r.username} (${new Date(r.at).toISOString().slice(0, 10)}): ${r.text}${r.source ? ` | source: ${r.source}` : ''}`).join('\n\n')
    : 'No suggestions yet.';
  return c.json<UiResponse>({
    showForm: {
      name: 'suggestionsView',
      form: {
        title: 'Map suggestions (latest 10)',
        description: 'Check each source before adding it to the bank.',
        fields: [{ name: 'list', label: 'Suggestions', type: 'paragraph', defaultValue: text }],
        acceptLabel: 'Done',
      },
    },
  });
});
