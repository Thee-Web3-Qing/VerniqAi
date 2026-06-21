import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable, voicePurchasesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

type Chain = "bsc" | "eth" | "polygon" | "tron";

const CHAIN_RPC: Record<Chain, string> = {
  bsc: "https://bsc-dataseed.binance.org/",
  eth: "https://cloudflare-eth.com/",
  polygon: "https://polygon-rpc.com/",
  tron: "https://api.trongrid.io/",
};

type TronTx = {
  ret?: Array<{ contractRet?: string }>;
  raw_data?: { contract?: Array<{ parameter?: { value?: { to_address?: string } } }> };
};
type TronResp = { data?: TronTx[] };

async function verifyOnChain(txHash: string, creatorWallet: string, chain: Chain): Promise<boolean> {
  try {
    if (chain === "tron") {
      const res = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, {
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as TronResp;
      const tx = data.data?.[0];
      if (!tx) return false;
      const confirmed = tx.ret?.[0]?.contractRet === "SUCCESS";
      const toAddr = tx.raw_data?.contract?.[0]?.parameter?.value?.to_address ?? "";
      return confirmed && toAddr.toLowerCase().includes(creatorWallet.replace("0x", "").toLowerCase());
    }

    const rpc = CHAIN_RPC[chain];
    const txRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txHash], id: 1 }),
    });
    const txData = (await txRes.json()) as { result?: { to?: string; blockNumber?: string } };
    const tx = txData.result;
    if (!tx || !tx.blockNumber) return false;

    const receiptRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 2 }),
    });
    const receiptData = (await receiptRes.json()) as { result?: { status?: string; to?: string } };
    const receipt = receiptData.result;
    if (!receipt || receipt.status !== "0x1") return false;

    const to = (receipt.to ?? tx.to ?? "").toLowerCase();
    return to === creatorWallet.toLowerCase();
  } catch {
    return false;
  }
}

router.get("/payment/info/:creatorId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { creatorId } = req.params;

  const [creator] = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
  if (!creator || !creator.isPublicCreator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  if (creator.pricePerGeneration <= 0) {
    res.json({ free: true });
    return;
  }

  const rows = await db
    .select()
    .from(voicePurchasesTable)
    .where(and(eq(voicePurchasesTable.buyerUserId, userId!), eq(voicePurchasesTable.creatorId, creatorId)));

  const generationsRemaining = rows.reduce((sum, r) => sum + r.generationsRemaining, 0);

  res.json({
    free: false,
    generationsRemaining,
    walletAddress: creator.walletAddress,
    priceUsd: creator.pricePerGeneration / 100,
    creatorName: creator.displayName ?? "Creator",
  });
});

router.post("/payment/verify", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { txHash, chain, creatorId } = req.body as { txHash?: string; chain?: Chain; creatorId?: string };

  if (!txHash || !chain || !creatorId) {
    res.status(400).json({ error: "txHash, chain, and creatorId are required" });
    return;
  }

  const txRef = `${chain}:${txHash}`;

  const [duplicate] = await db
    .select()
    .from(voicePurchasesTable)
    .where(eq(voicePurchasesTable.txRef, txRef));

  if (duplicate) {
    res.status(400).json({ error: "This transaction has already been used." });
    return;
  }

  const [creator] = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
  if (!creator || !creator.walletAddress) {
    res.status(404).json({ error: "Creator or wallet not found" });
    return;
  }

  const valid = await verifyOnChain(txHash, creator.walletAddress, chain);
  if (!valid) {
    res.status(402).json({ error: "Transaction not confirmed or recipient does not match creator's wallet. Double-check your tx hash and selected chain." });
    return;
  }

  await db.insert(voicePurchasesTable).values({
    buyerUserId: userId!,
    creatorId,
    flwTransactionId: txHash,
    txRef,
    amountPaid: creator.pricePerGeneration,
    generationsRemaining: 3,
    status: "paid",
  });

  res.json({ success: true, generationsRemaining: 3 });
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

  const generationsRemaining = rows.reduce((sum, r) => sum + r.generationsRemaining, 0);

  res.json({ purchased: generationsRemaining > 0, generationsRemaining, pricePerGeneration: creator.pricePerGeneration });
});

export default router;
