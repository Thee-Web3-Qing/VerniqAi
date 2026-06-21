import { useGetCreator, useCheckVoicePurchase, useVerifyVoicePayment, useGetPaymentInfo } from "@workspace/api-client-react";
import type { SocialConnection } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Brain, Copy, CheckCircle2, Lock, Unlock, ExternalLink, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱", twitter: "𝕏", instagram: "📸",
  youtube: "▶", linkedin: "💼", podcast: "🎙",
};

const CHAIN_LABELS: Record<string, string> = {
  bsc:      "BNB Smart Chain (BSC)",
  eth:      "Ethereum",
  polygon:  "Polygon",
  optimism: "Optimism",
  base:     "Base",
  tron:     "Tron",
  solana:   "Solana",
  ton:      "TON",
};

const TOKEN_STANDARDS: Record<string, Record<string, string>> = {
  bsc:      { USDT: "USDT (BEP-20)",    USDC: "USDC (BEP-20)",    BNB: "BNB"      },
  eth:      { USDT: "USDT (ERC-20)",    USDC: "USDC (ERC-20)",    ETH: "ETH"      },
  polygon:  { USDT: "USDT (Polygon)",   USDC: "USDC (Polygon)",   POL: "POL"      },
  optimism: { USDT: "USDT (Optimism)",  USDC: "USDC (Optimism)",  ETH: "ETH"      },
  base:     { USDT: "USDT (Base)",      USDC: "USDC (Base)",      ETH: "ETH"      },
  tron:     { USDT: "USDT (TRC-20)",    USDC: "USDC (TRC-20)",    TRX: "TRX"      },
  solana:   { USDT: "USDT (Solana)",    USDC: "USDC (Solana)",    SOL: "SOL"      },
  ton:      { TON:  "TON",              USDT: "USDT (TON)"                         },
};


function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function CryptoPayModal({
  creatorId,
  creatorName,
  walletAddress,
  walletChain,
  walletToken,
  priceUsd,
  onClose,
  onSuccess,
}: {
  creatorId: string;
  creatorName: string;
  walletAddress: string;
  walletChain: string;
  walletToken: string;
  priceUsd: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"info" | "verify" | "done">("info");
  const [txHash, setTxHash] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyPayment = useVerifyVoicePayment();
  const queryClient = useQueryClient();

  const chainLabel = CHAIN_LABELS[walletChain] ?? walletChain.toUpperCase();
  const tokenLabel = TOKEN_STANDARDS[walletChain]?.[walletToken] ?? walletToken;
  const notConfigured = !walletAddress || !walletChain || !walletToken;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleVerify = async () => {
    if (!txHash.trim()) return;
    setVerifyError("");
    verifyPayment.mutate(
      { txHash: txHash.trim(), creatorId },
      {
        onSuccess: () => {
          setStep("done");
          queryClient.invalidateQueries({ queryKey: ["/api/payment/check", creatorId] });
          queryClient.invalidateQueries({ queryKey: ["/api/payment/info", creatorId] });
          setTimeout(onSuccess, 1800);
        },
        onError: (err: any) => {
          setVerifyError(err?.message ?? "Could not verify transaction. Check the hash.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-background border border-border w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {step === "info" && (
          <div className="p-8 space-y-6">
            {notConfigured ? (
              <div className="text-center space-y-3">
                <div className="text-xs font-mono text-amber-500 uppercase tracking-widest">Not Ready</div>
                <h2 className="text-xl font-black font-sans">Creator hasn't set up payments</h2>
                <p className="text-sm text-muted-foreground font-mono">
                  This creator hasn't configured a wallet address and blockchain yet. Check back later.
                </p>
                <button onClick={onClose} className="mt-4 w-full py-3 border border-border text-sm font-mono hover:border-primary transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Step 1 of 2</div>
                  <h2 className="text-xl font-black font-sans">Send crypto to unlock</h2>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    You'll get <span className="font-bold text-foreground">3 generations</span> of {creatorName}'s voice.
                  </p>
                </div>

                {/* What to send — locked */}
                <div className="border border-primary/40 bg-primary/5 p-4 space-y-3">
                  <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">Exactly what to send</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Token</span>
                    <span className="text-sm font-black font-sans text-foreground">{tokenLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Network / Chain</span>
                    <span className="text-sm font-black font-sans text-foreground">{chainLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Amount (USD equiv.)</span>
                    <span className="text-sm font-black font-sans text-foreground">${priceUsd.toFixed(2)}</span>
                  </div>
                  <p className="text-xs font-mono text-amber-400/90 pt-1 border-t border-border">
                    ⚠ Only send {tokenLabel} on {chainLabel}. Sending any other token or chain = lost funds.
                  </p>
                </div>

                {/* Wallet address */}
                <div className="border border-border bg-secondary p-4 space-y-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Send to this address</div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-foreground flex-1 break-all">{walletAddress}</span>
                    <button onClick={handleCopy} className="flex-shrink-0 p-2 border border-border hover:border-primary transition-colors" title="Copy">
                      {copiedWallet ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  {copiedWallet && <p className="text-xs font-mono text-green-500">Copied!</p>}
                </div>

                {/* Ramphub CTA */}
                <div className="border border-border bg-card p-4 space-y-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest font-bold">Don't have crypto?</div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Buy <span className="font-bold text-foreground">{tokenLabel}</span> with Naira or bank transfer via <span className="font-bold text-foreground">Ramphub</span>.
                  </p>
                  <a href="https://ramphub.io" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                    Buy crypto on Ramphub <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <button onClick={() => setStep("verify")} className="w-full py-4 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors">
                  I've sent the payment →
                </button>
              </>
            )}
          </div>
        )}

        {step === "verify" && (
          <div className="p-8 space-y-6">
            <div>
              <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Step 2 of 2</div>
              <h2 className="text-xl font-black font-sans">Verify your payment</h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                Paste your transaction hash so we can confirm it on-chain.
              </p>
            </div>

            {/* Locked chain display */}
            <div className="border border-border bg-secondary px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Chain (locked)</span>
              <span className="text-sm font-black font-sans text-primary">{tokenLabel} · {chainLabel}</span>
            </div>

            {/* Tx hash */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Transaction hash</label>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x... or your tx hash"
                className="w-full px-4 py-3 bg-background border border-border font-mono text-sm focus:border-primary outline-none placeholder:text-muted-foreground"
              />
            </div>

            {verifyError && (
              <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs font-mono text-destructive">
                {verifyError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep("info")} className="px-4 py-3 border border-border text-sm font-bold hover:border-primary transition-colors">
                ← Back
              </button>
              <button
                onClick={handleVerify}
                disabled={!txHash.trim() || verifyPayment.isPending}
                className="flex-1 py-3 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifyPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyPayment.isPending ? "Verifying on-chain…" : "Verify & Unlock →"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-black font-sans">Voice unlocked!</h2>
            <p className="text-sm font-mono text-muted-foreground">3 generations ready. Taking you to create now…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const { data: creator, isLoading } = useGetCreator(id || "");
  const { data: purchaseStatus } = useCheckVoicePurchase(isSignedIn ? (id || "") : "");
  const { data: paymentInfo } = useGetPaymentInfo(isSignedIn && creator?.price_per_generation > 0 ? (id || "") : "");
  const [showPayModal, setShowPayModal] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
  if (!creator) return <div className="p-8 text-center text-muted-foreground font-mono">Creator not found.</div>;

  const socials = (creator.social_connections as SocialConnection[]) ?? [];
  const totalFollowers = socials.reduce((sum, s) => sum + s.followerCount, 0);
  const isPaid = creator.price_per_generation > 0;
  const generationsRemaining = purchaseStatus?.generationsRemaining ?? 0;
  const alreadyPurchased = !isPaid || generationsRemaining > 0;

  const handleUseVoice = () => {
    sessionStorage.setItem("verniq.selectedCreator", JSON.stringify({
      id: creator.id,
      display_name: creator.display_name,
      wallet_address: creator.wallet_address,
      price_per_generation: creator.price_per_generation,
      voice_dna: creator.voice_dna,
      niche: creator.niche,
    }));
    setLocation("/create");
  };

  const handlePayClick = () => {
    if (!isSignedIn) { setLocation("/auth"); return; }
    setShowPayModal(true);
  };

  return (
    <>
      {showPayModal && (
        <CryptoPayModal
          creatorId={creator.id}
          creatorName={creator.display_name || "Creator"}
          walletAddress={creator.wallet_address || ""}
          walletChain={creator.wallet_chain || ""}
          walletToken={creator.wallet_token || ""}
          priceUsd={creator.price_per_generation / 100}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => { setShowPayModal(false); handleUseVoice(); }}
        />
      )}

      <div className="w-full px-6 md:px-10 lg:px-16 py-12">
        {/* Header */}
        <div className="flex items-start gap-6 mb-10 pb-8 border-b border-border">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary border border-border flex-shrink-0 overflow-hidden flex items-center justify-center">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.display_name || "Creator"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-primary">
                {(creator.display_name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black font-sans mb-1">{creator.display_name || "Anonymous Creator"}</h1>
            <div className="flex flex-wrap gap-2 items-center mb-3">
              {creator.niche && (
                <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5">{creator.niche}</span>
              )}
              {creator.creator_eligible && (
                <span className="text-xs font-mono font-bold text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5">
                  ⭐ Verified Creator
                </span>
              )}
              {creator.total_generations_sold > 0 && (
                <span className="text-xs font-mono text-muted-foreground">{creator.total_generations_sold} generations sold</span>
              )}
            </div>
            {creator.bio && <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{creator.bio}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-8">
          {/* Left */}
          <div className="space-y-6">
            {socials.length > 0 && (
              <div className="border border-border bg-card p-6">
                <h2 className="text-sm font-black font-sans text-muted-foreground uppercase tracking-wider mb-4">Verified Socials</h2>
                <div className="space-y-3">
                  {socials.map((s) => (
                    <div key={s.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span>{PLATFORM_ICONS[s.platform] ?? "🔗"}</span>
                        <span className="text-muted-foreground capitalize">{s.platform}</span>
                        {s.username && <span className="text-foreground">{s.username}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">
                          {s.followerCount >= 1000 ? `${(s.followerCount / 1000).toFixed(1)}k` : s.followerCount}
                        </span>
                        {s.followerCount >= 5000 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                  ))}
                </div>
                {totalFollowers > 0 && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Total reach</span>
                    <span className="font-bold text-foreground">
                      {totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}k` : totalFollowers} followers
                    </span>
                  </div>
                )}
              </div>
            )}

            {creator.voice_dna && (
              <div className="border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Voice DNA Preview</h2>
                </div>
                <p className="text-sm italic text-muted-foreground mb-4">"{creator.voice_dna.summary}"</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                  {[
                    { label: "Tone",       value: creator.voice_dna.tone },
                    { label: "Energy",     value: creator.voice_dna.energy },
                    { label: "Hook style", value: creator.voice_dna.hookStyle },
                    { label: "Closing",    value: creator.voice_dna.closingStyle },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-border/30 pb-1.5">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="capitalize font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Purchase panel */}
          <div>
            <div className="border border-primary/40 bg-card sticky top-24">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                {isPaid && !alreadyPurchased
                  ? <Lock className="w-3.5 h-3.5 text-primary" />
                  : <Unlock className="w-3.5 h-3.5 text-green-500" />
                }
                <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Use This Voice</h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-center">
                  {isPaid ? (
                    alreadyPurchased ? (
                      <>
                        <div className="text-4xl font-black font-sans text-green-500 mb-1">{generationsRemaining}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          generation{generationsRemaining !== 1 ? "s" : ""} remaining
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl font-black font-sans text-primary mb-1">
                          ${(creator.price_per_generation / 100).toFixed(2)}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">3 generations · pay in crypto</div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="text-4xl font-black font-sans text-green-500 mb-1">Free</div>
                      <div className="text-xs font-mono text-muted-foreground">unlimited use</div>
                    </>
                  )}
                </div>

                {isPaid && !alreadyPurchased && (
                  <div className="border border-border bg-background p-4 space-y-2">
                    {[
                      "Pay creator's wallet in crypto",
                      "Use Ramphub to convert Naira → crypto",
                      "Paste tx hash → 3 generations unlocked",
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 text-xs font-mono">
                        <span className="text-primary font-bold flex-shrink-0">{i + 1}</span>
                        <span className="text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {creator.voice_dna ? (
                  alreadyPurchased || !isPaid ? (
                    <button
                      onClick={handleUseVoice}
                      className="w-full py-4 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                    >
                      Use This Voice DNA →
                    </button>
                  ) : (
                    <button
                      onClick={handlePayClick}
                      className="w-full py-4 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                    >
                      Pay ${(creator.price_per_generation / 100).toFixed(2)} in Crypto →
                    </button>
                  )
                ) : (
                  <div className="text-center text-xs font-mono text-muted-foreground border border-dashed border-border p-4">
                    This creator has not exposed their Voice DNA yet.
                  </div>
                )}

                {isPaid && !alreadyPurchased && (
                  <p className="text-xs font-mono text-muted-foreground text-center">
                    BSC · ETH · Polygon · Tron supported
                  </p>
                )}
                {alreadyPurchased && isPaid && (
                  <>
                    <div className="w-full bg-border rounded-none h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(100, (generationsRemaining / 3) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs font-mono text-green-600 text-center font-bold">
                      ✓ {generationsRemaining} / 3 generations left
                    </p>
                    {generationsRemaining === 1 && (
                      <p className="text-xs font-mono text-amber-500 text-center">
                        Last generation — top up after this one
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
