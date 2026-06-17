import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  bio: text("bio"),
  niche: text("niche"),
  avatarUrl: text("avatar_url"),
  isPublicCreator: boolean("is_public_creator").notNull().default(false),
  voiceDna: jsonb("voice_dna"),
  followerCount: integer("follower_count").notNull().default(0),
  socialConnections: jsonb("social_connections").default([]),
  walletAddress: text("wallet_address"),
  pricePerGeneration: integer("price_per_generation").notNull().default(0),
  totalGenerationsSold: integer("total_generations_sold").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
