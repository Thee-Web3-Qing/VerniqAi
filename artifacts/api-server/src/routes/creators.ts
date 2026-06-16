import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function profileToDto(p: typeof profilesTable.$inferSelect) {
  return {
    id: p.id,
    display_name: p.displayName ?? null,
    bio: p.bio ?? null,
    niche: p.niche ?? null,
    avatar_url: p.avatarUrl ?? null,
    is_public_creator: p.isPublicCreator,
    voice_dna: (p.voiceDna as Record<string, unknown> | null) ?? null,
    follower_count: p.followerCount,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

router.get("/creators", async (_req, res) => {
  const rows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.isPublicCreator, true));
  res.json(rows.map(profileToDto));
});

router.get("/creators/:id", async (req, res) => {
  const rows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, req.params.id));

  if (rows.length === 0 || !rows[0].isPublicCreator) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(profileToDto(rows[0]));
});

export default router;
