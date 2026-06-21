import { useState } from "react";
import { useLocation } from "wouter";
import { useListFeedPosts, useLikeFeedPost, getListFeedPostsQueryKey } from "@workspace/api-client-react";
import type { FeedPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Copy, Check, ExternalLink, Brain } from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "📱",
  twitter: "𝕏",
  instagram: "📸",
  "youtube-shorts": "▶",
  linkedin: "💼",
  podcast: "🎙",
  newsletter: "✉",
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok Script",
  twitter: "Twitter Thread",
  instagram: "Instagram Reels",
  "youtube-shorts": "YouTube Shorts",
  linkedin: "LinkedIn Post",
  podcast: "Podcast",
  newsletter: "Newsletter",
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
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text.slice(0, 700))}`,
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

function PostCard({ post }: { post: FeedPost }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const likeMutation = useLikeFeedPost();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const content = post.content;
  const isLong = content.length > 300;
  const displayContent = isLong && !expanded ? content.slice(0, 300) + "…" : content;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleUseVoice = () => {
    sessionStorage.setItem("verniq.feedVoiceUserId", post.user_id);
    setLocation(`/creators/${post.user_id}`);
  };

  return (
    <article className="border border-border bg-card hover:border-primary/40 transition-colors">
      {/* Author row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-secondary border border-border flex items-center justify-center flex-shrink-0">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.display_name || "?"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black text-primary">
                {(post.display_name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <button
              onClick={() => post.display_name && setLocation(`/voice/${encodeURIComponent(post.display_name)}`)}
              className="text-sm font-bold hover:text-primary transition-colors"
            >
              {post.display_name || "Anonymous"}
            </button>
            {post.niche && (
              <span className="ml-2 text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{post.niche}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>{PLATFORM_ICONS[post.platform]}</span>
          <span>{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
          <span className="text-border">·</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Idea */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest">Idea</p>
        <p className="text-sm font-bold text-foreground">{post.idea}</p>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest mt-3">Content</p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
          {displayContent}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-mono text-primary mt-2 hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Share buttons */}
          {SHARE_PLATFORMS.map(sp => (
            <a
              key={sp.id}
              href={sp.getUrl(content)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono font-bold text-muted-foreground hover:text-foreground border border-border hover:border-primary px-2 py-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {sp.label}
            </a>
          ))}
        </div>

        {/* Use Voice DNA */}
        <button
          onClick={handleUseVoice}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary border border-primary/40 bg-primary/5 px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Brain className="w-3 h-3" />
          Use Voice DNA
        </button>
      </div>
    </article>
  );
}

const FILTER_PLATFORMS = ["all", "tiktok", "twitter", "instagram", "linkedin", "podcast", "newsletter"];

export default function Feed() {
  const { data: posts, isLoading } = useListFeedPosts();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const filtered = (posts ?? []).filter(p => {
    if (filter !== "all" && p.platform !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.idea.toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q) ||
        (p.niche ?? "").toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-12">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-4xl font-black font-sans">Content Feed</h1>
          <button
            onClick={() => setLocation("/create")}
            className="bg-primary text-primary-foreground px-4 py-2 text-sm font-bold rounded-none hover:bg-primary/90 transition-colors"
          >
            + Create & Share
          </button>
        </div>
        <p className="text-muted-foreground text-sm">
          Real content by real creators. Click "Use Voice DNA" to write like them.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by idea, creator, niche..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-card border border-border p-3 rounded-none font-sans text-sm focus:outline-none focus:border-primary mb-4"
      />

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTER_PLATFORMS.map(pf => (
          <button
            key={pf}
            onClick={() => setFilter(pf)}
            className={`text-xs font-bold border px-4 py-2 rounded-none transition-colors capitalize ${
              filter === pf
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary text-muted-foreground"
            }`}
          >
            {pf === "all" ? "All" : (PLATFORM_ICONS[pf] ?? "") + " " + (PLATFORM_LABELS[pf] ?? pf)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="py-20 text-center text-muted-foreground font-mono">Loading feed...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="py-20 text-center border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground font-mono text-lg mb-2">No posts yet.</p>
          <p className="text-xs font-mono text-muted-foreground mb-6">
            Generate content and share it to the feed to be the first.
          </p>
          <button
            onClick={() => setLocation("/create")}
            className="bg-primary text-primary-foreground px-6 py-3 text-sm font-bold rounded-none hover:bg-primary/90 transition-colors"
          >
            Generate my first post →
          </button>
        </div>
      )}

      <div className="space-y-6">
        {filtered.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
