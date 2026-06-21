import { Router } from "express";
import { db, profilesTable, feedPostsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function isCreatorEligible(socialConnections: unknown): boolean {
  if (!Array.isArray(socialConnections)) return false;
  return socialConnections.some(
    (c: { followerCount?: number }) => typeof c.followerCount === "number" && c.followerCount >= 5000
  );
}

router.get("/voice/:username", async (req, res) => {
  const { username } = req.params;

  const rows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.displayName, username))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const p = rows[0];

  const recentPosts = await db
    .select()
    .from(feedPostsTable)
    .where(and(eq(feedPostsTable.userId, p.id), eq(feedPostsTable.isPublic, true)))
    .orderBy(desc(feedPostsTable.createdAt))
    .limit(10);

  const socials = (p.socialConnections as unknown[]) ?? [];

  res.json({
    id: p.id,
    username: p.displayName ?? username,
    display_name: p.displayName ?? null,
    bio: p.bio ?? null,
    niche: p.niche ?? null,
    avatar_url: p.avatarUrl ?? null,
    voice_dna: (p.voiceDna as Record<string, unknown> | null) ?? null,
    voice_dna_0g_hash: p.voiceDna0gHash ?? null,
    price_per_generation: p.pricePerGeneration,
    creator_eligible: isCreatorEligible(socials),
    social_connections: socials,
    total_generations_sold: p.totalGenerationsSold,
    recent_posts: recentPosts.map(post => ({
      id: post.id,
      user_id: post.userId,
      display_name: post.displayName ?? null,
      avatar_url: post.avatarUrl ?? null,
      niche: post.niche ?? null,
      idea: post.idea,
      platform: post.platform,
      content: post.content,
      voice_match: post.voiceMatch,
      like_count: post.likeCount,
      is_public: post.isPublic,
      created_at: post.createdAt.toISOString(),
    })),
  });
});

export default router;
