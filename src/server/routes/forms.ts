import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

export const forms = new Hono();

// Read-only view of suggestions; nothing to save.
forms.post('/suggestions-view', async (c) => c.json<UiResponse>({}));
