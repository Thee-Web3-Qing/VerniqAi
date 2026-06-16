import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

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

router.get("/profile", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
  if (rows.length === 0) {
    // Auto-create profile on first access
    const inserted = await db
      .insert(profilesTable)
      .values({ id: userId! })
      .returning();
    res.json(profileToDto(inserted[0]));
    return;
  }
  res.json(profileToDto(rows[0]));
});

router.put("/profile", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { display_name, bio, niche, is_public_creator, voice_dna } = req.body;

  // Upsert profile
  const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
  if (rows.length === 0) {
    const inserted = await db
      .insert(profilesTable)
      .values({
        id: userId!,
        displayName: display_name ?? null,
        bio: bio ?? null,
        niche: niche ?? null,
        isPublicCreator: is_public_creator ?? false,
        voiceDna: voice_dna ?? null,
      })
      .returning();
    res.json(profileToDto(inserted[0]));
    return;
  }

  const updated = await db
    .update(profilesTable)
    .set({
      ...(display_name !== undefined && { displayName: display_name }),
      ...(bio !== undefined && { bio }),
      ...(niche !== undefined && { niche }),
      ...(is_public_creator !== undefined && { isPublicCreator: is_public_creator }),
      ...(voice_dna !== undefined && { voiceDna: voice_dna }),
    })
    .where(eq(profilesTable.id, userId!))
    .returning();

  res.json(profileToDto(updated[0]));
});

export default router;
