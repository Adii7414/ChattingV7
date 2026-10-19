import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { APP_ID, requireActive } from '../server/chat';
import { friendIds } from '../server/friends';

export default createEndpoint({
  description: 'Finds the signed-in user’s friends, to start a chat or add them to a group',
  authenticated: true,
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ people: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), image: z.string().nullable() })) }),
  execute: async ({ input, context }) => {
    await requireActive(context.user.id);
    const q = input.query.trim().toLowerCase();
    const friends = new Set(await friendIds(context.user.id));
    const { records } = await zite.auth.findAllUsers({ appIds: [APP_ID], limit: 500 });
    const people = records
      .filter((u) => friends.has(u.id))
      .filter((u) => !q || u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q))
      .slice(0, 20)
      .map((u) => ({ id: u.id, name: u.name || u.email.split('@')[0], email: u.email, image: u.image ?? null }));
    return { people };
  },
});
