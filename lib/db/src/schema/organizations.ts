import { pgTable, text, uuid, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const organizationsTable = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull(),
  voiceDna: jsonb("voice_dna"),
  voiceDna0gHash: text("voice_dna_0g_hash"),
  inviteCode: text("invite_code").notNull().default(""),
  plan: text("plan").notNull().default("team"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orgMembersTable = pgTable("org_members", {
  orgId: uuid("org_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.orgId, table.userId] }),
]);

export type Organization = typeof organizationsTable.$inferSelect;
export type OrgMember = typeof orgMembersTable.$inferSelect;
