import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, feedPostsTable, profilesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function postToDto(p: typeof feedPostsTable.$inferSelect) {
  return {
    id: p.id,
    user_id: p.userId,
    display_name: p.displayName ?? null,
    avatar_url: p.avatarUrl ?? null,
    niche: p.niche ?? null,
    idea: p.idea,
    platform: p.platform,
    content: p.content,
    voice_match: p.voiceMatch,
    like_count: p.likeCount,
    is_public: p.isPublic,
    created_at: p.createdAt.toISOString(),
  };
}

router.get("/feed", async (_req, res) => {
  const rows = await db
    .select()
    .from(feedPostsTable)
    .where(eq(feedPostsTable.isPublic, true))
    .orderBy(desc(feedPostsTable.createdAt))
    .limit(100);
  res.json(rows.map(postToDto));
});

router.post("/feed", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { idea, platform, content, voice_match } = req.body;

  if (!idea || !platform || !content) {
    res.status(400).json({ error: "idea, platform, and content are required" });
    return;
  }

  const profile = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId!))
    .limit(1);

  const p = profile[0];

  const inserted = await db
    .insert(feedPostsTable)
    .values({
      userId: userId!,
      displayName: p?.displayName ?? null,
      avatarUrl: p?.avatarUrl ?? null,
      niche: p?.niche ?? null,
      idea,
      platform,
      content,
      voiceMatch: voice_match ?? 0,
      isPublic: true,
    })
    .returning();

  res.status(201).json(postToDto(inserted[0]));
});

router.post("/feed/:id/like", async (req, res) => {
  const rows = await db
    .update(feedPostsTable)
    .set({ likeCount: sql`${feedPostsTable.likeCount} + 1` })
    .where(eq(feedPostsTable.id, req.params.id))
    .returning();

  if (rows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ like_count: rows[0].likeCount });
});

export default router;
