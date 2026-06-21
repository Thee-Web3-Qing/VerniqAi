import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { uploadToZeroG } from "../lib/zerog";

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
    voice_dna_0g_hash: p.voiceDna0gHash ?? null,
    voice_dna_0g_tx: p.voiceDna0gTx ?? null,
    language: p.language ?? "english",
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

router.get("/profile", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
  if (rows.length === 0) {
    const inserted = await db.insert(profilesTable).values({ id: userId! }).returning();
    res.json(profileToDto(inserted[0]));
    return;
  }
  res.json(profileToDto(rows[0]));
});

router.put("/profile", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const {
    display_name,
    bio,
    niche,
    is_public_creator,
    voice_dna,
    social_connections,
    wallet_address,
    price_per_generation,
    language,
  } = req.body;

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
        socialConnections: social_connections ?? [],
        walletAddress: wallet_address ?? null,
        pricePerGeneration: price_per_generation ?? 0,
        language: language ?? "english",
      })
      .returning();
    res.json(profileToDto(inserted[0]));

    if (voice_dna) {
      uploadToZeroG({ ...voice_dna, _userId: userId, _savedAt: Date.now() })
        .then(async (result) => {
          if (result) {
            await db.update(profilesTable)
              .set({ voiceDna0gHash: result.hash, voiceDna0gTx: result.tx })
              .where(eq(profilesTable.id, userId!));
            console.log(`[0G] Voice DNA stored, hash: ${result.hash}`);
          }
        })
        .catch((err) => console.error("[0G] Background upload error:", err));
    }
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
      ...(social_connections !== undefined && { socialConnections: social_connections }),
      ...(wallet_address !== undefined && { walletAddress: wallet_address }),
      ...(price_per_generation !== undefined && { pricePerGeneration: price_per_generation }),
      ...(language !== undefined && { language }),
    })
    .where(eq(profilesTable.id, userId!))
    .returning();

  res.json(profileToDto(updated[0]));

  if (voice_dna !== undefined) {
    uploadToZeroG({ ...voice_dna, _userId: userId, _savedAt: Date.now() })
      .then(async (result) => {
        if (result) {
          await db.update(profilesTable)
            .set({ voiceDna0gHash: result.hash, voiceDna0gTx: result.tx })
            .where(eq(profilesTable.id, userId!));
          console.log(`[0G] Voice DNA updated on-chain, hash: ${result.hash}`);
        }
      })
      .catch((err) => console.error("[0G] Background upload error:", err));
  }
});

export default router;
