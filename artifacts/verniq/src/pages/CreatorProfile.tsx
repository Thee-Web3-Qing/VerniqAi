import { useGetCreator, useCheckVoicePurchase, useInitiateVoicePayment } from "@workspace/api-client-react";
import type { SocialConnection } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Brain, Copy, CheckCircle2, ExternalLink, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/react";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱",
  twitter: "𝕏",
  instagram: "📸",
  youtube: "▶",
  linkedin: "💼",
  podcast: "🎙",
};

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function CreatorProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const { data: creator, isLoading } = useGetCreator(id || "");
  const { data: purchaseStatus } = useCheckVoicePurchase(isSignedIn ? (id || "") : "");
  const initiatePayment = useInitiateVoicePayment();
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
  if (!creator) return <div className="p-8 text-center text-muted-foreground font-mono">Creator not found.</div>;

  const socials = (creator.social_connections as SocialConnection[]) ?? [];
  const totalFollowers = socials.reduce((sum, s) => sum + s.followerCount, 0);
  const isPaid = creator.price_per_generation > 0;
  const alreadyPurchased = purchaseStatus?.purchased ?? !isPaid;

  const handleCopyWallet = () => {
    if (creator.wallet_address) {
      navigator.clipboard.writeText(creator.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handlePayAndUse = async () => {
    if (!isSignedIn) {
      setLocation("/auth");
      return;
    }
    setPaying(true);
    try {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      const callbackUrl = `${window.location.origin}${basePath}/payment/callback?creatorId=${creator.id}`;
      const result = await initiatePayment.mutateAsync({ creatorId: creator.id, callbackUrl });
      if (result.alreadyPurchased || result.alreadyFree) {
        handleUseVoice();
      } else if (result.paymentLink) {
        window.location.href = result.paymentLink;
      }
    } catch {
      setPaying(false);
    }
  };

  return (
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
              <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5 rounded-none">{creator.niche}</span>
            )}
            {creator.creator_eligible && (
              <span className="text-xs font-mono font-bold text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5">
                ⭐ Verified Creator
              </span>
            )}
            {creator.total_generations_sold > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                {creator.total_generations_sold} generations sold
              </span>
            )}
          </div>
          {creator.bio && <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{creator.bio}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-8">
        {/* Left: Social proof + about */}
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
                      <span className="text-sm font-mono font-bold text-foreground">
                        {s.followerCount >= 1000
                          ? `${(s.followerCount / 1000).toFixed(1)}k`
                          : s.followerCount}
                      </span>
                      {s.followerCount >= 5000 && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalFollowers > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs font-mono text-muted-foreground">
                  <span>Total reach</span>
                  <span className="font-bold text-foreground">
                    {totalFollowers >= 1000
                      ? `${(totalFollowers / 1000).toFixed(1)}k`
                      : totalFollowers} followers
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Voice DNA preview */}
          {creator.voice_dna && (
            <div className="border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Voice DNA Preview</h2>
              </div>
              <p className="text-sm italic text-muted-foreground mb-4">"{creator.voice_dna.summary}"</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                {[
                  { label: "Tone", value: creator.voice_dna.tone },
                  { label: "Energy", value: creator.voice_dna.energy },
                  { label: "Hook style", value: creator.voice_dna.hookStyle },
                  { label: "Closing", value: creator.voice_dna.closingStyle },
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
              {isPaid && !alreadyPurchased ? (
                <Lock className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-green-500" />
              )}
              <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Use This Voice</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Pricing */}
              <div className="text-center">
                {isPaid ? (
                  alreadyPurchased ? (
                    <>
                      <div className="text-4xl font-black font-sans text-green-500 mb-1">Unlocked</div>
                      <div className="text-xs font-mono text-muted-foreground">you own access to this voice</div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-black font-sans text-primary mb-1">
                        ${(creator.price_per_generation / 100).toFixed(2)}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">one-time payment · unlimited use</div>
                    </>
                  )
                ) : (
                  <>
                    <div className="text-4xl font-black font-sans text-green-500 mb-1">Free</div>
                    <div className="text-xs font-mono text-muted-foreground">no charge to use</div>
                  </>
                )}
              </div>

              {/* Payment steps for unpurchased paid voices */}
              {isPaid && !alreadyPurchased && (
                <div className="border border-border bg-background p-4 space-y-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">How it works</div>
                  {[
                    "Pay once via card or mobile money",
                    "Access is recorded to your account",
                    "Generate content with this voice anytime",
                  ].map((step, i) => (
                    <div key={i} className="flex gap-3 text-xs font-mono">
                      <span className="text-primary font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA button */}
              {creator.voice_dna ? (
                alreadyPurchased || !isPaid ? (
                  <button
                    onClick={handleUseVoice}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors"
                  >
                    Use This Voice DNA →
                  </button>
                ) : (
                  <button
                    onClick={handlePayAndUse}
                    disabled={paying || initiatePayment.isPending}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paying || initiatePayment.isPending
                      ? "Redirecting to payment…"
                      : `Pay $${(creator.price_per_generation / 100).toFixed(2)} via Flutterwave →`}
                  </button>
                )
              ) : (
                <div className="text-center text-xs font-mono text-muted-foreground border border-dashed border-border p-4">
                  This creator has not exposed their Voice DNA yet.
                </div>
              )}

              {isPaid && !alreadyPurchased && (
                <p className="text-xs font-mono text-muted-foreground text-center">
                  Powered by Flutterwave · Cards, mobile money & more
                </p>
              )}

              {alreadyPurchased && isPaid && (
                <p className="text-xs font-mono text-green-600 text-center font-bold">
                  ✓ Payment verified — this voice is yours
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
