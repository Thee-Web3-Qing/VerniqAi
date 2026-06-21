import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const voicePurchasesTable = pgTable("voice_purchases", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  buyerUserId: text("buyer_user_id").notNull(),
  creatorId: text("creator_id").notNull(),
  flwTransactionId: text("flw_transaction_id"),
  txRef: text("tx_ref"),
  amountPaid: integer("amount_paid").notNull(),
  status: text("status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
