import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";

const router = Router();

function isCreatorEligible(socialConnections: unknown): boolean {
  if (!Array.isArray(socialConnections)) return false;
  return socialConnections.some(
    (c: { followerCount?: number }) => typeof c.followerCount === "number" && c.followerCount >= 5000
  );
}

function profileToDto(p: typeof profilesTable.$inferSelect) {
  const socials = (p.socialConnections as unknown[]) ?? [];
  return {
    id: p.id,
    display_name: p.displayName ?? null,
    bio: p.bio ?? null,
    niche: p.niche ?? null,
    avatar_url: p.avatarUrl ?? null,
    is_public_creator: p.isPublicCreator,
    voice_dna: (p.voiceDna as Record<string, unknown> | null) ?? null,
    follower_count: p.followerCount,
    social_connections: socials,
    wallet_address: p.walletAddress ?? null,
    price_per_generation: p.pricePerGeneration,
    total_generations_sold: p.totalGenerationsSold,
    creator_eligible: isCreatorEligible(socials),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

router.get("/creators", async (_req, res) => {
  const rows = await db
    .select()
    .from(profilesTable)
    .where(and(eq(profilesTable.isPublicCreator, true), isNotNull(profilesTable.voiceDna)));
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
