import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedPostsTable = pgTable("feed_posts", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  niche: text("niche"),
  idea: text("idea").notNull(),
  platform: text("platform").notNull(),
  content: text("content").notNull(),
  voiceMatch: integer("voice_match").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeedPostSchema = createInsertSchema(feedPostsTable).omit({ createdAt: true });
export type InsertFeedPost = z.infer<typeof insertFeedPostSchema>;
export type FeedPost = typeof feedPostsTable.$inferSelect;
