import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, draftsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function draftToDto(d: typeof draftsTable.$inferSelect) {
  return {
    id: d.id,
    user_id: d.userId,
    idea: d.idea,
    tiktok: d.tiktok ?? null,
    twitter: (d.twitter as string[] | null) ?? null,
    voice_match: d.voiceMatch,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

router.get("/drafts", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(draftsTable)
    .where(eq(draftsTable.userId, userId!))
    .orderBy(desc(draftsTable.createdAt));
  res.json(rows.map(draftToDto));
});

router.post("/drafts", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { idea, tiktok, twitter, voice_match } = req.body;

  const inserted = await db
    .insert(draftsTable)
    .values({
      userId: userId!,
      idea: idea ?? "",
      tiktok: tiktok ?? null,
      twitter: twitter ?? null,
      voiceMatch: voice_match ?? 0,
    })
    .returning();

  res.status(201).json(draftToDto(inserted[0]));
});

router.get("/drafts/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(draftsTable)
    .where(and(eq(draftsTable.id, req.params.id), eq(draftsTable.userId, userId!)));

  if (rows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(draftToDto(rows[0]));
});

router.delete("/drafts/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  await db
    .delete(draftsTable)
    .where(and(eq(draftsTable.id, req.params.id), eq(draftsTable.userId, userId!)));
  res.status(204).send();
});

export default router;
