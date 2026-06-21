import { ZgFile, Indexer } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import fs from "fs";
import os from "os";
import path from "path";

const EVM_RPC = "https://evmrpc-testnet.0g.ai";
const INDEXER_RPC = "https://indexer-storage-testnet-turbo.0g.ai";

export async function uploadToZeroG(
  data: object
): Promise<{ hash: string; tx: string } | null> {
  const privateKey = process.env.ZERO_G_PRIVATE_KEY;
  if (!privateKey) return null;

  const tmpPath = path.join(os.tmpdir(), `verniq-dna-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));

    const file = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr || !tree) {
      await file.close();
      return null;
    }

    const rootHash = String(tree.rootHash());
    const provider = new ethers.JsonRpcProvider(EVM_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const indexer = new Indexer(INDEXER_RPC);

    const [tx, uploadErr] = await indexer.upload(file, EVM_RPC, signer);
    await file.close();

    if (uploadErr) {
      console.error("[0G] Upload error:", uploadErr);
      return null;
    }

    return { hash: rootHash, tx: tx ? String(tx) : "" };
  } catch (err) {
    console.error("[0G] Upload failed:", err);
    return null;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}
