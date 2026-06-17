import { useListCreators } from "@workspace/api-client-react";
import type { SocialConnection } from "@workspace/api-client-react";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱",
  twitter: "𝕏",
  instagram: "📸",
  youtube: "▶",
  linkedin: "💼",
  podcast: "🎙",
};

export default function Creators() {
  const { data: creators, isLoading } = useListCreators();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading marketplace...</div>;

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-6xl">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black font-sans mb-4">Creator Marketplace</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Borrow established Voice DNAs for your own content. Pay per generation.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search by niche or name..."
          className="w-full max-w-md bg-card border border-border p-3 rounded-none font-sans text-sm focus:outline-none focus:border-primary"
        />
        <div className="flex flex-wrap gap-2">
          <button className="text-xs font-bold border border-primary bg-primary/10 text-primary px-4 py-2 rounded-none">All</button>
          <button className="text-xs font-bold border border-border hover:border-primary px-4 py-2 rounded-none">TikTok</button>
          <button className="text-xs font-bold border border-border hover:border-primary px-4 py-2 rounded-none">Twitter</button>
          <button className="text-xs font-bold border border-border hover:border-primary px-4 py-2 rounded-none">Podcasts</button>
          <button className="text-xs font-bold border border-border hover:border-primary px-4 py-2 rounded-none">Business</button>
        </div>
      </div>

      {(!creators || creators.length === 0) ? (
        <div className="text-center py-20 border border-dashed border-border rounded-none bg-card/50">
          <p className="text-muted-foreground font-mono text-lg mb-2">No public creators available yet.</p>
          <p className="text-xs font-mono text-muted-foreground">
            Creators with 5k+ followers can list their Voice DNA here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creators.map(creator => {
            const socials = (creator.social_connections as SocialConnection[]) ?? [];
            const eligibleSocials = socials.filter(s => s.followerCount >= 5000);
            const totalFollowers = socials.reduce((sum, s) => sum + s.followerCount, 0);

            return (
              <div key={creator.id} className="p-6 border border-border bg-card rounded-none hover:border-primary transition-colors h-full flex flex-col group">
                {/* Creator header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-none bg-gradient-to-br from-primary/20 to-secondary overflow-hidden border border-border flex-shrink-0 flex items-center justify-center">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.display_name || "Creator"} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-primary">
                        {(creator.display_name || "?").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg group-hover:text-primary transition-colors mb-1 truncate">
                      {creator.display_name || "Anonymous Creator"}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {creator.niche && (
                        <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5 rounded-none">{creator.niche}</span>
                      )}
                      {creator.creator_eligible && (
                        <span className="text-xs font-mono font-bold text-green-500 border border-green-500/30 bg-green-500/10 px-1.5 py-0.5">
                          ⭐
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {creator.bio && (
                  <p className="text-sm text-muted-foreground mb-5 line-clamp-2 leading-relaxed">{creator.bio}</p>
                )}

                {/* Social badges */}
                {eligibleSocials.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {eligibleSocials.map(s => (
                      <div key={s.platform} className="flex items-center gap-1 text-xs font-mono border border-border bg-background px-2 py-1">
                        <span>{PLATFORM_ICONS[s.platform] ?? "🔗"}</span>
                        <span className="text-muted-foreground">
                          {s.followerCount >= 1000 ? `${(s.followerCount / 1000).toFixed(1)}k` : s.followerCount}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-green-500 ml-0.5" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-5 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4 text-xs font-mono">
                    <div className="text-muted-foreground">
                      {totalFollowers > 0 ? (
                        <span>
                          Reach: <span className="text-foreground font-bold">
                            {totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}k` : totalFollowers}
                          </span>
                        </span>
                      ) : (
                        <span>Voice DNA Active</span>
                      )}
                    </div>
                    {creator.price_per_generation > 0 ? (
                      <span className="text-primary font-bold border border-primary/30 bg-primary/10 px-2 py-0.5">
                        ${(creator.price_per_generation / 100).toFixed(2)}/gen
                      </span>
                    ) : (
                      <span className="text-green-500 font-bold border border-green-500/30 bg-green-500/10 px-2 py-0.5">
                        Free
                      </span>
                    )}
                  </div>

                  {creator.total_generations_sold > 0 && (
                    <p className="text-xs font-mono text-muted-foreground mb-3">
                      {creator.total_generations_sold} generations sold
                    </p>
                  )}

                  <Link href={`/creators/${creator.id}`} className="w-full block">
                    <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-3 rounded-none font-bold text-sm transition-all">
                      View Voice DNA →
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
