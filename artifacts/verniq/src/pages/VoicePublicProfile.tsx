import { useParams, useLocation } from "wouter";
import { useGetPublicProfile, useLikeFeedPost, getListFeedPostsQueryKey } from "@workspace/api-client-react";
import type { FeedPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, CheckCircle2, Heart, Copy, Check, ExternalLink, Share2 } from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱",
  twitter: "𝕏",
  instagram: "📸",
  "youtube-shorts": "▶",
  linkedin: "💼",
  podcast: "🎙",
  newsletter: "✉",
  youtube: "▶",
};

const SHARE_PLATFORMS = [
  {
    id: "twitter",
    label: "𝕏",
    getUrl: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`,
  },
  {
    id: "linkedin",
    label: "in",
    getUrl: (text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?summary=${encodeURIComponent(text.slice(0, 700))}`,
  },
  {
    id: "whatsapp",
    label: "WA",
    getUrl: (text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text.slice(0, 1000))}`,
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function MiniPostCard({ post }: { post: FeedPost }) {
  const queryClient = useQueryClient();
  const likeMutation = useLikeFeedPost();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isLong = post.content.length > 250;
  const displayContent = isLong && !expanded ? post.content.slice(0, 250) + "…" : post.content;

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikeCount(c => c + 1);
    likeMutation.mutate({ postId: post.id }, {
      onSuccess: (data) => {
        setLikeCount(data.like_count);
        queryClient.invalidateQueries({ queryKey: getListFeedPostsQueryKey() });
      },
    });
  };

  return (
    <div className="border border-border bg-card">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>{PLATFORM_ICONS[post.platform] ?? "✦"}</span>
            <span>{post.platform}</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{timeAgo(post.created_at)}</span>
        </div>
        <p className="text-xs font-bold text-foreground mb-2">{post.idea}</p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
          {displayContent}
        </pre>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs font-mono text-primary mt-1 hover:underline">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-xs font-mono transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
        >
          <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} />
          {likeCount}
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(post.content); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
          className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
        {SHARE_PLATFORMS.map(sp => (
          <a
            key={sp.id}
            href={sp.getUrl(post.content)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono font-bold text-muted-foreground hover:text-foreground border border-border hover:border-primary px-1.5 py-0.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {sp.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function VoicePublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useGetPublicProfile(username ?? "");
  const [linkCopied, setLinkCopied] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground font-mono">Profile not found.</div>;

  const profileUrl = `${window.location.origin}/voice/${encodeURIComponent(username ?? "")}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleUseVoice = () => {
    sessionStorage.setItem("verniq.selectedCreator", JSON.stringify({
      id: profile.id,
      display_name: profile.display_name,
      wallet_address: null,
      price_per_generation: profile.price_per_generation,
      voice_dna: profile.voice_dna,
      niche: profile.niche,
    }));
    setLocation("/create");
  };

  const socials = profile.social_connections ?? [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-8 pb-8 border-b border-border">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary border border-border flex-shrink-0 flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || "?"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-primary">
              {(profile.display_name || "?").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-black font-sans">{profile.display_name || username}</h1>
            {profile.creator_eligible && (
              <span className="text-xs font-mono font-bold text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5">
                ⭐ Verified Creator
              </span>
            )}
          </div>
          {profile.niche && (
            <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5 rounded-none mr-2">{profile.niche}</span>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mt-3">{profile.bio}</p>
          )}

          {/* Shareable link */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground flex-1 max-w-sm truncate">
              <Share2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{profileUrl}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs font-mono font-bold border border-border hover:border-primary px-3 py-1.5 transition-colors"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Share this link in your social bios so your audience can find you on Verniq
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        {/* Left: posts */}
        <div>
          <h2 className="text-sm font-black font-sans uppercase tracking-wider text-muted-foreground mb-4">
            Recent Content
          </h2>
          {profile.recent_posts.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-center text-muted-foreground font-mono text-sm">
              No public posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {profile.recent_posts.map(post => (
                <MiniPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-5">
          {/* Use Voice CTA */}
          <div className="border border-primary/40 bg-card">
            <div className="px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-primary uppercase tracking-wider">Use This Voice</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {profile.price_per_generation > 0 ? (
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">${(profile.price_per_generation / 100).toFixed(2)}</div>
                  <div className="text-xs font-mono text-muted-foreground">per generation</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-black text-green-500">Free</div>
                  <div className="text-xs font-mono text-muted-foreground">no charge to use</div>
                </div>
              )}
              {profile.total_generations_sold > 0 && (
                <p className="text-xs font-mono text-muted-foreground text-center">
                  {profile.total_generations_sold} generations sold
                </p>
              )}
              <button
                onClick={handleUseVoice}
                disabled={!profile.voice_dna}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {profile.voice_dna ? "Write in this voice →" : "Voice DNA not available"}
              </button>
            </div>
          </div>

          {/* Voice DNA preview */}
          {profile.voice_dna && (
            <div className="border border-border bg-card p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Voice DNA</h3>
              <p className="text-xs italic text-muted-foreground mb-3">"{profile.voice_dna.summary}"</p>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { label: "Tone", value: profile.voice_dna.tone },
                  { label: "Energy", value: profile.voice_dna.energy },
                  { label: "Hook style", value: profile.voice_dna.hookStyle },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold capitalize">{value}</span>
                  </div>
                ))}
              </div>
              {profile.voice_dna_0g_hash && (
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-1.5 text-xs font-mono text-green-500">
                  <span>⛓</span>
                  <span>Stored on 0G blockchain</span>
                </div>
              )}
            </div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div className="border border-border bg-card p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Socials</h3>
              <div className="space-y-2">
                {socials.map(s => (
                  <div key={s.platform} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span>{PLATFORM_ICONS[s.platform] ?? "🔗"}</span>
                      <span className="text-muted-foreground capitalize">{s.platform}</span>
                      {s.username && <span className="text-foreground">{s.username}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">
                        {s.followerCount >= 1000 ? `${(s.followerCount / 1000).toFixed(1)}k` : s.followerCount}
                      </span>
                      {s.followerCount >= 5000 && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
