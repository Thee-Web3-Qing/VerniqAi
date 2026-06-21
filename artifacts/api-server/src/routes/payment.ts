import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable, voicePurchasesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/payment/initiate", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { creatorId, callbackUrl } = req.body as { creatorId?: string; callbackUrl?: string };

  if (!creatorId) {
    res.status(400).json({ error: "creatorId is required" });
    return;
  }

  const flwKey = process.env.FLW_SECRET_KEY;
  if (!flwKey) {
    res.status(500).json({ error: "Payment not configured — FLW_SECRET_KEY missing" });
    return;
  }

  const [creator] = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
  if (!creator || !creator.isPublicCreator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  if (creator.pricePerGeneration <= 0) {
    res.json({ alreadyFree: true });
    return;
  }

  const existing = await db
    .select()
    .from(voicePurchasesTable)
    .where(and(eq(voicePurchasesTable.buyerUserId, userId!), eq(voicePurchasesTable.creatorId, creatorId)));

  if (existing.length > 0) {
    res.json({ alreadyPurchased: true });
    return;
  }

  const txRef = `verniq_${creatorId.slice(0, 8)}_${userId!.slice(0, 8)}_${Date.now()}`;
  const redirectUrl = callbackUrl ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/payment/callback?creatorId=${creatorId}`;

  const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${flwKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: (creator.pricePerGeneration / 100).toFixed(2),
      currency: "USD",
      redirect_url: redirectUrl,
      customer: {
        email: `user-${userId!.slice(-8)}@verniq.app`,
        name: "Verniq User",
      },
      customizations: {
        title: `Use ${creator.displayName || "Creator"}'s Voice`,
        description: "One-time voice generation access — powered by Verniq",
      },
      meta: { creatorId, buyerUserId: userId },
    }),
  });

  const flwData = (await flwRes.json()) as { status: string; data?: { link: string } };

  if (flwData.status !== "success" || !flwData.data?.link) {
    res.status(500).json({ error: "Flutterwave error — could not create payment link" });
    return;
  }

  res.json({ paymentLink: flwData.data.link, txRef });
});

router.post("/payment/verify", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { transactionId, creatorId } = req.body as { transactionId?: string | number; creatorId?: string };

  if (!transactionId || !creatorId) {
    res.status(400).json({ error: "transactionId and creatorId are required" });
    return;
  }

  const existing = await db
    .select()
    .from(voicePurchasesTable)
    .where(and(eq(voicePurchasesTable.buyerUserId, userId!), eq(voicePurchasesTable.creatorId, creatorId)));

  if (existing.length > 0) {
    res.json({ success: true, alreadyPurchased: true });
    return;
  }

  const flwKey = process.env.FLW_SECRET_KEY;
  if (!flwKey) {
    res.status(500).json({ error: "Payment not configured" });
    return;
  }

  const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${flwKey}` },
  });

  const flwData = (await flwRes.json()) as {
    status: string;
    data?: { status: string; amount: number; tx_ref: string };
  };

  if (flwData.status !== "success" || flwData.data?.status !== "successful") {
    res.status(402).json({ error: "Payment not completed or verification failed" });
    return;
  }

  await db.insert(voicePurchasesTable).values({
    buyerUserId: userId!,
    creatorId,
    flwTransactionId: String(transactionId),
    txRef: flwData.data.tx_ref,
    amountPaid: Math.round((flwData.data.amount ?? 0) * 100),
    status: "paid",
  });

  res.json({ success: true });
});

router.get("/payment/check/:creatorId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { creatorId } = req.params;

  const [creator] = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
  if (!creator || creator.pricePerGeneration <= 0) {
    res.json({ purchased: true, pricePerGeneration: 0 });
    return;
  }

  const rows = await db
    .select()
    .from(voicePurchasesTable)
    .where(and(eq(voicePurchasesTable.buyerUserId, userId!), eq(voicePurchasesTable.creatorId, creatorId)));

  res.json({ purchased: rows.length > 0, pricePerGeneration: creator.pricePerGeneration });
});

export default router;
