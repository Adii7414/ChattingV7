import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/staff';
import { ensureOfficialChat, postOfficial } from '../server/official';
import { verificationCriteria } from '../server/verification';

export default createEndpoint({
  authenticated: true,
  description: 'Lists communities with size, activity, reports and verification, and lets staff verify or delete one',
  inputSchema: z.object({ search: z.string().optional(), deleteId: z.string().optional(), verification: z.enum(['all', 'Pending', 'Verified']).optional(), decide: z.object({ id: z.string(), decision: z.enum(['approve', 'reject', 'revoke']), note: z.string().max(1000).optional() }).optional(), criteriaFor: z.string().optional() }),
  outputSchema: z.object({
    communities: z.array(z.object({ id: z.string(), name: z.string(), emoji: z.string(), description: z.string(), isPublic: z.boolean(), owner: z.string(), ownerId: z.string(), members: z.number(), channels: z.number(), messages7d: z.number(), openReports: z.number(), createdAt: z.string(), verificationStatus: z.string(), application: z.string(), requestedAt: z.string().nullable() })),
    pending: z.number(),
    criteria: z.array(z.object({ key: z.string(), label: z.string(), met: z.boolean(), detail: z.string() })).nullable(),
  }),
  execute: async ({ input, context }) => {
    requireStaff(context.user);
    if (input.deleteId) await zite.communities.delete({ id: input.deleteId });
    if (input.decide) {
      const { id, decision, note } = input.decide;
      const c = await zite.communities.findOne({ id });
      const now = new Date().toISOString();
      if (c) {
        const status = decision === 'approve' ? 'Verified' : decision === 'reject' ? 'Rejected' : null;
        await zite.communities.update({ id, record: { verificationStatus: status, verificationDecisionNote: note?.trim() || null, verifiedAt: decision === 'approve' ? now : null } as never });
        const owner = Array.isArray(c.owner) ? c.owner[0] : (c.owner as string | null);
        const msg = decision === 'approve'
          ? `🎉 ${c.name} is now verified! A gold check will appear next to its name everywhere on Chatting.`
          : decision === 'reject'
            ? `Your verification application for ${c.name} wasn’t approved this time.${note?.trim() ? `\n\nNote from our team: ${note.trim()}` : ''}\n\nYou can apply again from Community settings → Verification.`
            : `The verified badge for ${c.name} has been removed.${note?.trim() ? `\n\nReason: ${note.trim()}` : ''}`;
        if (owner) { const { id: cid } = await ensureOfficialChat(owner, 'Chatting'); await postOfficial(cid, 'Chatting', msg).catch((e) => console.error(e)); }
      }
    }
    const r = await zite.sql({
      query: `SELECT c.id, COALESCE(c."name",'') AS name, COALESCE(c."emoji",'') AS emoji, COALESCE(c."description",'') AS description, COALESCE(c."isPublic", false) AS "isPublic",
          COALESCE(o."name",'Unknown') AS owner, COALESCE(c."owner"->>0,'') AS "ownerId", c.created_at AS "createdAt",
          COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(c."members") = 'array' THEN c."members" ELSE '[]'::jsonb END), 0) AS members,
          (SELECT COUNT(*) FROM "Conversations" cv WHERE cv."communityId" = c.id::text) AS channels,
          (SELECT COUNT(*) FROM "Conversations" cv JOIN "ConversationsMessages" l ON l."conversationsId" = cv.id JOIN "Messages" m ON m.id = l."messagesId"
            WHERE cv."communityId" = c.id::text AND m.created_at >= now() - interval '7 days') AS "messages7d",
          (SELECT COUNT(*) FROM "Reports" rp WHERE rp."communityId" = c.id::text AND COALESCE(rp."status",'Open') = 'Open') AS "openReports",
          COALESCE(c."verificationStatus",'None') AS "verificationStatus", COALESCE(c."verificationApplication",'') AS application, c."verificationRequestedAt" AS "requestedAt"
        FROM "Communities" c LEFT JOIN "ziteUsers" o ON o.id = c."owner"->>0
        WHERE ($1 = '' OR c."name" ILIKE '%' || $1 || '%') AND ($2 = 'all' OR c."verificationStatus" = $2)
        ORDER BY "openReports" DESC, "messages7d" DESC LIMIT 200`,
      params: [input.search?.trim() ?? '', input.verification ?? 'all'],
    });
    const [pend, crit] = await Promise.all([
      zite.sql({ query: `SELECT COUNT(*) AS n FROM "Communities" WHERE "verificationStatus" = 'Pending'` }),
      input.criteriaFor ? verificationCriteria(input.criteriaFor) : null,
    ]);
    return { pending: Number(pend.rows[0]?.n ?? 0), criteria: crit?.criteria ?? null, communities: r.rows.map((c) => ({ id: String(c.id), name: String(c.name), emoji: String(c.emoji), description: String(c.description), isPublic: !!c.isPublic, owner: String(c.owner), ownerId: String(c.ownerId), members: Number(c.members), channels: Number(c.channels), messages7d: Number(c.messages7d), openReports: Number(c.openReports), createdAt: String(c.createdAt), verificationStatus: String(c.verificationStatus), application: String(c.application), requestedAt: c.requestedAt ? String(c.requestedAt) : null })) };
  },
});
