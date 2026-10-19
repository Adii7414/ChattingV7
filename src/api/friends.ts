import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { APP_ID, ids, requireActive } from '../server/chat';
import { fail } from '../server/errors';
import { pairKey, relationOf, requestPrefs } from '../server/friends';

const person = z.object({ id: z.string(), name: z.string(), email: z.string(), image: z.string().nullable(), relation: z.enum(['none', 'friends', 'outgoing', 'incoming']), online: z.boolean() });

export default createEndpoint({
  description: 'Lists friends and friend requests, searches for people, and sends or answers friend requests',
  authenticated: true,
  inputSchema: z.object({ action: z.enum(['list', 'search', 'request', 'accept', 'decline', 'remove']), userId: z.string().optional(), query: z.string().optional() }),
  outputSchema: z.object({ friends: z.array(person), incoming: z.array(person), outgoing: z.array(person), results: z.array(person) }),
  execute: async ({ input, context }) => {
    const me = context.user.id;
    await requireActive(me);
    const other = input.userId;
    if (['request', 'accept', 'decline', 'remove'].includes(input.action)) {
      if (!other || other === me) throw fail('Pick someone first.');
      const key = pairKey(me, other);
      const existing = await zite.friendships.findOne({ filters: { pairKey: key } });
      const rel = await relationOf(me, other);
      if (input.action === 'request') {
        if (rel === 'friends') throw fail('You’re already friends.');
        if (rel === 'outgoing') throw fail('Your friend request is already pending.');
        if (rel === 'incoming') {
          await zite.friendships.update({ id: existing!.id, record: { status: 'Accepted', acceptedAt: new Date().toISOString() } });
        } else {
          const prefs = await requestPrefs(other);
          if (!prefs.allowFriendRequests) throw fail('This person isn’t accepting friend requests.');
          const blocked = await zite.profiles.findOne({ filters: { userKey: other } });
          if (ids(blocked?.blocked as string[] | null).includes(me)) throw fail('You can’t send a friend request to this person.');
          await zite.friendships.create({ record: { pairKey: key, requester: me, addressee: other, status: 'Pending' } });
        }
      } else if (input.action === 'accept') {
        if (rel !== 'incoming') throw fail('There’s no friend request to accept.');
        await zite.friendships.update({ id: existing!.id, record: { status: 'Accepted', acceptedAt: new Date().toISOString() } });
      } else if (existing) {
        await zite.friendships.delete({ id: existing.id });
      }
    }

    const q = input.query?.trim().toLowerCase() ?? '';
    const [rows, users] = await Promise.all([
      zite.sql({
        query: `SELECT f."status", f."requester"->>0 AS req, CASE WHEN f."requester"->>0 = $1 THEN f."addressee"->>0 ELSE f."requester"->>0 END AS id,
            u."name", u."email", u."image", p."lastSeenAt"
          FROM "Friendships" f JOIN "ziteUsers" u ON u.id::text = CASE WHEN f."requester"->>0 = $1 THEN f."addressee"->>0 ELSE f."requester"->>0 END
          LEFT JOIN "Presence" p ON p."userKey" = u.id::text
          WHERE f."requester"->>0 = $1 OR f."addressee"->>0 = $1 ORDER BY u."name"`,
        params: [me],
      }),
      input.action === 'search' && q.length >= 2 ? zite.auth.findAllUsers({ appIds: [APP_ID], limit: 1000 }) : null,
    ]);
    const map = (r: Record<string, unknown>) => ({
      id: String(r.id), name: String(r.name || String(r.email ?? '').split('@')[0] || 'Someone'), email: String(r.email ?? ''), image: r.image ? String(r.image) : null,
      relation: (r.status === 'Accepted' ? 'friends' : r.req === me ? 'outgoing' : 'incoming') as 'friends' | 'outgoing' | 'incoming',
      online: !!r.lastSeenAt && Date.now() - new Date(String(r.lastSeenAt)).getTime() < 75_000,
    });
    const all = rows.rows.map(map);
    const relById = new Map(all.map((p) => [p.id, p.relation]));
    const results = (users?.records ?? [])
      .filter((u) => u.id !== me && ((u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase() === q || u.email.toLowerCase().split('@')[0].includes(q)))
      .slice(0, 20)
      .map((u) => ({ id: u.id, name: u.name || u.email.split('@')[0], email: '', image: u.image ?? null, relation: relById.get(u.id) ?? ('none' as const), online: false }));
    return { friends: all.filter((p) => p.relation === 'friends'), incoming: all.filter((p) => p.relation === 'incoming'), outgoing: all.filter((p) => p.relation === 'outgoing'), results };
  },
});
