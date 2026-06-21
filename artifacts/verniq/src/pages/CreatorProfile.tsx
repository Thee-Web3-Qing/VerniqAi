import { useGetCreator, useCheckVoicePurchase, useVerifyVoicePayment, useGetPaymentInfo } from "@workspace/api-client-react";
import type { SocialConnection, CryptoChain } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Brain, Copy, CheckCircle2, Lock, Unlock, ExternalLink, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱", twitter: "𝕏", instagram: "📸",
  youtube: "▶", linkedin: "💼", podcast: "🎙",
};

const CHAINS: { id: CryptoChain; label: string; symbol: string; note: string }[] = [
  { id: "bsc",     label: "BNB Smart Chain", symbol: "BNB / USDT",  note: "Low fees — recommended" },
  { id: "eth",     label: "Ethereum",         symbol: "ETH / USDT",  note: "" },
  { id: "polygon", label: "Polygon",           symbol: "MATIC / USDT", note: "Very low fees" },
  { id: "tron",    label: "Tron",              symbol: "TRX / USDT",  note: "Popular in Nigeria" },
];

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function CryptoPayModal({
  creatorId,
  creatorName,
  walletAddress,
  priceUsd,
  onClose,
  onSuccess,
}: {
  creatorId: string;
  creatorName: string;
  walletAddress: string;
  priceUsd: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"info" | "verify" | "done">("info");
  const [chain, setChain] = useState<CryptoChain>("bsc");
  const [txHash, setTxHash] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyPayment = useVerifyVoicePayment();
  const queryClient = useQueryClient();

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleVerify = async () => {
    if (!txHash.trim()) return;
    setVerifyError("");
    verifyPayment.mutate(
      { txHash: txHash.trim(), chain, creatorId },
      {
        onSuccess: () => {
          setStep("done");
          queryClient.invalidateQueries({ queryKey: ["/api/payment/check", creatorId] });
          queryClient.invalidateQueries({ queryKey: ["/api/payment/info", creatorId] });
          setTimeout(onSuccess, 1800);
        },
        onError: (err: any) => {
          setVerifyError(err?.message ?? "Could not verify transaction. Check the hash and chain.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-background border border-border w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "info" && (
          <div className="p-8 space-y-6">
            <div>
              <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Step 1 of 2</div>
              <h2 className="text-xl font-black font-sans">Send crypto to unlock this voice</h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                Send <span className="font-bold text-foreground">${priceUsd.toFixed(2)} USD</span> worth of crypto to {creatorName}'s wallet.
              </p>
            </div>

            {/* Wallet address */}
            <div className="border border-border bg-secondary p-4 space-y-2">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Creator's wallet address</div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-foreground flex-1 break-all">{walletAddress}</span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 border border-border hover:border-primary transition-colors"
                  title="Copy address"
                >
                  {copiedWallet ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {copiedWallet && <p className="text-xs font-mono text-green-500">Copied!</p>}
            </div>

            {/* Ramphub CTA */}
            <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="text-xs font-mono text-primary uppercase tracking-widest font-bold">Don't have crypto?</div>
              <p className="text-xs font-mono text-muted-foreground">
                Use <span className="font-bold text-foreground">Ramphub</span> to buy crypto with Naira or any currency — cards, bank transfer, mobile money.
              </p>
              <a
                href="https://ramphub.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
              >
                Buy crypto on Ramphub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Chain note */}
            <p className="text-xs font-mono text-muted-foreground">
              Supports BSC, Ethereum, Polygon, and Tron. After sending, click below to enter your transaction hash.
            </p>

            <button
              onClick={() => setStep("verify")}
              className="w-full py-4 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              I've sent the payment →
            </button>
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

            {/* Chain selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Which chain did you send on?</label>
              <div className="grid grid-cols-2 gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChain(c.id)}
                    className={`p-3 border text-left transition-colors ${
                      chain === c.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-xs font-bold font-sans">{c.label}</div>
                    <div className="text-xs font-mono text-muted-foreground">{c.symbol}</div>
                    {c.note && (
                      <div className="text-xs font-mono text-primary mt-0.5">{c.note}</div>
                    )}
                  </button>
                ))}
              </div>
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
              <button
                onClick={() => setStep("info")}
                className="px-4 py-3 border border-border text-sm font-bold hover:border-primary transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleVerify}
                disabled={!txHash.trim() || verifyPayment.isPending}
                className="flex-1 py-3 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifyPayment.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyPayment.isPending ? "Verifying on-chain…" : "Verify & Unlock"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-black font-sans">Voice unlocked!</h2>
            <p className="text-sm font-mono text-muted-foreground">Taking you to create content now…</p>
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
      {showPayModal && creator.wallet_address && (
        <CryptoPayModal
          creatorId={creator.id}
          creatorName={creator.display_name || "Creator"}
          walletAddress={creator.wallet_address}
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
