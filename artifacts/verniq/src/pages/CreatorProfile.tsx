import { useGetCreator } from "@workspace/api-client-react";
import type { SocialConnection } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Brain, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";

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
  const { data: creator, isLoading } = useGetCreator(id || "");
  const [copied, setCopied] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
  if (!creator) return <div className="p-8 text-center text-muted-foreground font-mono">Creator not found.</div>;

  const socials = (creator.social_connections as SocialConnection[]) ?? [];
  const eligibleSocials = socials.filter(s => s.followerCount >= 5000);
  const totalFollowers = socials.reduce((sum, s) => sum + s.followerCount, 0);

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
          {/* Social connections */}
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
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Use This Voice</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Pricing */}
              <div className="text-center">
                {creator.price_per_generation > 0 ? (
                  <>
                    <div className="text-4xl font-black font-sans text-primary mb-1">
                      ${(creator.price_per_generation / 100).toFixed(2)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">per generation</div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-black font-sans text-green-500 mb-1">Free</div>
                    <div className="text-xs font-mono text-muted-foreground">no charge to use</div>
                  </>
                )}
              </div>

              {/* Wallet */}
              {creator.wallet_address && creator.price_per_generation > 0 && (
                <div className="border border-border bg-background p-4 space-y-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Payment wallet</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-foreground flex-1 truncate">
                      {truncateAddress(creator.wallet_address)}
                    </span>
                    <button
                      onClick={handleCopyWallet}
                      className="p-1.5 border border-border hover:border-primary transition-colors"
                      title="Copy full address"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs font-mono text-green-500">Address copied!</p>
                  )}
                </div>
              )}

              {/* How it works */}
              {creator.price_per_generation > 0 && (
                <div className="space-y-2 text-xs font-mono text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">1</span>
                    <span>Click "Use This Voice DNA" below</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">2</span>
                    <span>Generate your content</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">3</span>
                    <span>Send ${(creator.price_per_generation / 100).toFixed(2)} to the wallet above</span>
                  </div>
                </div>
              )}

              {creator.voice_dna ? (
                <button
                  onClick={handleUseVoice}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors"
                >
                  Use This Voice DNA →
                </button>
              ) : (
                <div className="text-center text-xs font-mono text-muted-foreground border border-dashed border-border p-4">
                  This creator has not exposed their Voice DNA yet.
                </div>
              )}

              <p className="text-xs font-mono text-muted-foreground text-center">
                Payment is on an honor system. Always pay creators for their work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
