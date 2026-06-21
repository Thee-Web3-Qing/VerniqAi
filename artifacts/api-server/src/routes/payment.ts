import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable, voicePurchasesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

type EvmChain = "bsc" | "eth" | "polygon" | "optimism" | "base";
type Chain = EvmChain | "tron" | "solana" | "ton";

const ALCHEMY_SLUGS: Record<EvmChain | "solana", string> = {
  eth:      "eth-mainnet",
  polygon:  "polygon-mainnet",
  bsc:      "bnb-mainnet",
  optimism: "opt-mainnet",
  base:     "base-mainnet",
  solana:   "solana-mainnet",
};

function alchemyRpc(chain: EvmChain | "solana"): string {
  return `https://${ALCHEMY_SLUGS[chain]}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ""}`;
}

type TronTx = {
  ret?: Array<{ contractRet?: string }>;
  raw_data?: { contract?: Array<{ parameter?: { value?: { to_address?: string } } }> };
};
type TronResp = { data?: TronTx[] };

async function verifyOnChain(txHash: string, creatorWallet: string, chain: Chain): Promise<boolean> {
  try {
    // ── Tron ───────────────────────────────────────────────────────────────────
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

    // ── Solana ─────────────────────────────────────────────────────────────────
    if (chain === "solana") {
      const rpc = alchemyRpc("solana");
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [txHash, { encoding: "json", maxSupportedTransactionVersion: 0 }],
        }),
      });
      const data = (await res.json()) as {
        result?: {
          meta?: { err: unknown };
          transaction?: { message?: { accountKeys?: string[] } };
        };
      };
      const result = data.result;
      if (!result || result.meta?.err !== null) return false;
      const keys = result.transaction?.message?.accountKeys ?? [];
      return keys.some((k) => k.toLowerCase() === creatorWallet.toLowerCase());
    }

    // ── TON ────────────────────────────────────────────────────────────────────
    if (chain === "ton") {
      const res = await fetch(
        `https://tonapi.io/v2/blockchain/transactions/${encodeURIComponent(txHash)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as {
        success?: boolean;
        in_msg?: { destination?: { address?: string } };
        out_msgs?: Array<{ destination?: { address?: string } }>;
      };
      if (!data.success) return false;
      const creatorLower = creatorWallet.toLowerCase().replace(/[^a-z0-9]/g, "");
      const addrs = [
        data.in_msg?.destination?.address ?? "",
        ...(data.out_msgs ?? []).map((m) => m.destination?.address ?? ""),
      ].map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ""));
      return addrs.some((a) => a.includes(creatorLower) || creatorLower.includes(a.slice(-32)));
    }

    // ── EVM (ETH / Polygon / BSC / Optimism / Base) ────────────────────────────
    const rpc = alchemyRpc(chain as EvmChain);
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
    walletChain: creator.walletChain,
    walletToken: creator.walletToken,
    priceUsd: creator.pricePerGeneration / 100,
    creatorName: creator.displayName ?? "Creator",
  });
});

router.post("/payment/verify", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { txHash, creatorId } = req.body as { txHash?: string; creatorId?: string };

  if (!txHash || !creatorId) {
    res.status(400).json({ error: "txHash and creatorId are required" });
    return;
  }

  const [creator] = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
  if (!creator || !creator.walletAddress) {
    res.status(404).json({ error: "Creator or wallet not found" });
    return;
  }

  const chain = creator.walletChain as Chain | null;
  if (!chain) {
    res.status(400).json({ error: "Creator hasn't configured a blockchain. Ask them to update their profile." });
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

  res.json({
    purchased: generationsRemaining > 0,
    generationsRemaining,
    pricePerGeneration: creator.pricePerGeneration,
    walletChain: creator.walletChain ?? null,
    walletToken: creator.walletToken ?? null,
  });
});

router.get("/payment/sales", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(voicePurchasesTable)
    .where(eq(voicePurchasesTable.creatorId, userId!))
    .orderBy(desc(voicePurchasesTable.createdAt));

  res.json(rows.map((r) => ({
    id: r.id,
    buyer_user_id: r.buyerUserId,
    tx_hash: r.flwTransactionId ?? null,
    tx_ref: r.txRef ?? null,
    chain: r.txRef ? r.txRef.split(":")[0] : null,
    amount_paid: r.amountPaid,
    generations_remaining: r.generationsRemaining,
    status: r.status,
    created_at: r.createdAt.toISOString(),
  })));
});

export default router;
