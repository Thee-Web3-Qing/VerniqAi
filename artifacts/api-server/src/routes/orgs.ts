import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable, organizationsTable, orgMembersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { uploadToZeroG } from "../lib/zerog";

const router = Router();

type VoiceDNALike = {
  formalityScore: number;
  avgSentenceLength: number;
  tone: string;
  energy: string;
  hookStyle: string;
  closingStyle: string;
  signaturePhrases: string[];
  emotions?: string;
  charisma?: string;
  pacing?: string;
  contentStyle?: string;
  summary: string;
};

function modeOf<T>(arr: T[]): T {
  if (arr.length === 0) return arr[0];
  const counts = new Map<string, number>();
  arr.forEach(v => {
    const k = String(v);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  let maxCount = 0, result = arr[0];
  counts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      const match = arr.find(v => String(v) === key);
      if (match !== undefined) result = match;
    }
  });
  return result;
}

function blendVoiceDNAs(dnas: VoiceDNALike[]): VoiceDNALike {
  if (dnas.length === 1) return dnas[0];

  const avgFormality = Math.round(dnas.reduce((s, d) => s + (d.formalityScore || 5), 0) / dnas.length);
  const avgSentLen = Math.round(dnas.reduce((s, d) => s + (d.avgSentenceLength || 10), 0) / dnas.length);

  const toneMode = modeOf(dnas.map(d => d.tone));
  const energyMode = modeOf(dnas.map(d => d.energy));
  const hookMode = modeOf(dnas.map(d => d.hookStyle));
  const closingMode = modeOf(dnas.map(d => d.closingStyle));

  const allPhrases = [...new Set(dnas.flatMap(d => d.signaturePhrases || []))].slice(0, 8);
  const allEmotions = dnas.map(d => d.emotions).filter(Boolean) as string[];
  const allCharisma = dnas.map(d => d.charisma).filter(Boolean) as string[];
  const allPacing = dnas.map(d => d.pacing).filter(Boolean) as string[];
  const allStyle = dnas.map(d => d.contentStyle).filter(Boolean) as string[];

  return {
    tone: toneMode,
    energy: energyMode,
    avgSentenceLength: avgSentLen,
    hookStyle: hookMode,
    closingStyle: closingMode,
    signaturePhrases: allPhrases,
    formalityScore: avgFormality,
    emotions: allEmotions.length ? allEmotions.join(", ") : undefined,
    charisma: allCharisma.length ? modeOf(allCharisma) : undefined,
    pacing: allPacing.length ? modeOf(allPacing) : undefined,
    contentStyle: allStyle.length ? modeOf(allStyle) : undefined,
    summary: `Brand voice of ${dnas.length} creators — ${toneMode} tone, ${energyMode} energy, formality ${avgFormality}/10`,
  };
}

function orgToDto(
  org: typeof organizationsTable.$inferSelect,
  members: Array<{ user_id: string; role: string; display_name: string | null }>
) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    owner_id: org.ownerId,
    voice_dna: org.voiceDna ?? null,
    voice_dna_0g_hash: org.voiceDna0gHash ?? null,
    invite_code: org.inviteCode,
    plan: org.plan,
    members,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
  };
}

router.post("/orgs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48) + "-" + Date.now().toString(36);

  const existing = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (existing.length > 0) {
    res.status(409).json({ error: "Name taken, try a different one" });
    return;
  }

  const inviteCode = crypto.randomUUID();

  const org = await db.insert(organizationsTable)
    .values({ name: name.trim(), slug, ownerId: userId!, inviteCode })
    .returning();

  await db.insert(orgMembersTable)
    .values({ orgId: org[0].id, userId: userId!, role: "owner" });

  res.json(orgToDto(org[0], [{ user_id: userId!, role: "owner", display_name: null }]));
});

router.get("/orgs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const memberships = await db.select().from(orgMembersTable).where(eq(orgMembersTable.userId, userId!));
  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const orgIds = memberships.map(m => m.orgId);
  const orgs = await db.select().from(organizationsTable).where(inArray(organizationsTable.id, orgIds));

  res.json(orgs.map(org => {
    const myRole = memberships.find(m => m.orgId === org.id)?.role ?? "member";
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      owner_id: org.ownerId,
      role: myRole,
      voice_dna: org.voiceDna ?? null,
      voice_dna_0g_hash: org.voiceDna0gHash ?? null,
      plan: org.plan,
      created_at: org.createdAt.toISOString(),
    };
  }));
});

router.get("/orgs/:slug", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;

  const orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (orgs.length === 0) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const org = orgs[0];
  const membership = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, org.id), eq(orgMembersTable.userId, userId!)));

  if (membership.length === 0) {
    res.status(403).json({ error: "Not a member of this organization" });
    return;
  }

  const allMembers = await db.select().from(orgMembersTable).where(eq(orgMembersTable.orgId, org.id));
  const memberIds = allMembers.map(m => m.userId);
  const profiles = memberIds.length > 0
    ? await db.select({ id: profilesTable.id, displayName: profilesTable.displayName })
        .from(profilesTable)
        .where(inArray(profilesTable.id, memberIds))
    : [];

  const members = allMembers.map(m => ({
    user_id: m.userId,
    role: m.role,
    display_name: profiles.find(p => p.id === m.userId)?.displayName ?? null,
  }));

  res.json(orgToDto(org, members));
});

router.post("/orgs/join", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { inviteCode } = req.body as { inviteCode?: string };

  if (!inviteCode?.trim()) {
    res.status(400).json({ error: "inviteCode is required" });
    return;
  }

  const orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.inviteCode, inviteCode.trim()));
  if (orgs.length === 0) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const org = orgs[0];
  const existing = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, org.id), eq(orgMembersTable.userId, userId!)));

  if (existing.length > 0) {
    res.json({ already_member: true, slug: org.slug });
    return;
  }

  await db.insert(orgMembersTable).values({ orgId: org.id, userId: userId!, role: "member" });
  res.json({ joined: true, slug: org.slug, name: org.name });
});

router.post("/orgs/:slug/build-voice", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;

  const orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (orgs.length === 0) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const org = orgs[0];
  if (org.ownerId !== userId) {
    res.status(403).json({ error: "Only the owner can build brand voice" });
    return;
  }

  const allMembers = await db.select().from(orgMembersTable).where(eq(orgMembersTable.orgId, org.id));
  const memberIds = allMembers.map(m => m.userId);
  const profiles = memberIds.length > 0
    ? await db.select({ id: profilesTable.id, voiceDna: profilesTable.voiceDna })
        .from(profilesTable)
        .where(inArray(profilesTable.id, memberIds))
    : [];

  const dnas = profiles
    .map(p => p.voiceDna as VoiceDNALike | null)
    .filter(Boolean) as VoiceDNALike[];

  if (dnas.length === 0) {
    res.status(400).json({ error: "No members have Voice DNA yet. Ask members to complete onboarding first." });
    return;
  }

  const blended = blendVoiceDNAs(dnas);
  const updated = await db.update(organizationsTable)
    .set({ voiceDna: blended as unknown as Record<string, unknown> })
    .where(eq(organizationsTable.id, org.id))
    .returning();

  res.json({ voice_dna: blended, contributor_count: dnas.length });

  uploadToZeroG({ ...blended, _orgId: org.id, _orgSlug: org.slug, _builtAt: Date.now() })
    .then(async (result) => {
      if (result) {
        await db.update(organizationsTable)
          .set({ voiceDna0gHash: result.hash })
          .where(eq(organizationsTable.id, org.id));
        console.log(`[0G] Org brand voice stored, hash: ${result.hash}`);
      }
    })
    .catch((err) => console.error("[0G] Org voice upload error:", err));
});

router.delete("/orgs/:slug/members/:memberId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { slug, memberId } = req.params;

  const orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
  if (orgs.length === 0) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const org = orgs[0];
  if (org.ownerId !== userId) {
    res.status(403).json({ error: "Only the owner can remove members" });
    return;
  }

  if (memberId === userId) {
    res.status(400).json({ error: "Owner cannot remove themselves" });
    return;
  }

  await db.delete(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, org.id), eq(orgMembersTable.userId, memberId)));

  res.json({ removed: true });
});

export default router;
