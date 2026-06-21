import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetDraft, getListDraftsQueryKey, useShareFeedPost, getListFeedPostsQueryKey } from "@workspace/api-client-react";
import type { ContentPlatform, FeedPlatform } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Check, ArrowLeft, Share2, ExternalLink, CheckCircle2 } from "lucide-react";

const PLATFORM_LABELS: Record<string, { icon: string; label: string }> = {
  tiktok: { icon: "📱", label: "TikTok Script" },
  twitter: { icon: "𝕏", label: "Twitter / X Thread" },
  instagram: { icon: "📸", label: "Instagram Reels Script" },
  "youtube-shorts": { icon: "▶", label: "YouTube Shorts Script" },
  linkedin: { icon: "💼", label: "LinkedIn Post" },
  podcast: { icon: "🎙", label: "Podcast Script" },
  newsletter: { icon: "✉", label: "Newsletter" },
};

const SOCIAL_SHARE_PLATFORMS = [
  {
    id: "twitter",
    label: "Post on 𝕏",
    getUrl: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`,
  },
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    getUrl: (text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?summary=${encodeURIComponent(text.slice(0, 700))}`,
  },
  {
    id: "whatsapp",
    label: "Send via WhatsApp",
    getUrl: (text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text.slice(0, 1000))}`,
  },
];

interface ResultData {
  idea: string;
  platform?: ContentPlatform;
  output?: string;
  parts?: string[] | null;
  voiceMatch: number;
  // legacy
  tiktok?: string;
  twitter?: string[] | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? "text-primary" : score >= 75 ? "text-yellow-400" : "text-muted-foreground";
  return (
    <div className={`text-center ${color}`}>
      <div className="text-4xl font-black font-sans">{score}%</div>
      <div className="text-xs font-mono text-muted-foreground mt-0.5">voice match</div>
    </div>
  );
}

export default function Results() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [data, setData] = useState<ResultData | null>(null);
  const [saved, setSaved] = useState(false);
  const [sharedToFeed, setSharedToFeed] = useState(false);
  const [sharingToFeed, setSharingToFeed] = useState(false);

  const shareFeedPost = useShareFeedPost();

  const { data: dbDraft } = useGetDraft(id ?? "", {
    query: { queryKey: ["/api/drafts", id], enabled: !!id, retry: false },
  });

  useEffect(() => {
    if (id) {
      const stored = sessionStorage.getItem(`verniq.pending.${id}`);
      if (stored) {
        setData(JSON.parse(stored));
        setSaved(true);
      } else if (dbDraft) {
        setData({
          idea: dbDraft.idea,
          platform: "tiktok",
          output: dbDraft.tiktok ?? "",
          parts: dbDraft.twitter ?? null,
          voiceMatch: dbDraft.voice_match,
        });
        setSaved(true);
      } else {
        setLocation("/create");
      }
    }
  }, [id, dbDraft, setLocation]);

  if (!data) return <div className="p-8 text-center text-muted-foreground font-mono">Loading results...</div>;

  const platform = data.platform ?? "tiktok";
  const platformInfo = PLATFORM_LABELS[platform] ?? { icon: "✦", label: "Content" };
  const output = data.output ?? data.tiktok ?? "";
  const parts = data.parts ?? data.twitter ?? null;
  const isThreadFormat = Array.isArray(parts) && parts.length > 0;

  const fullContent = isThreadFormat
    ? [output, ...(parts ?? [])].filter(Boolean).join("\n\n")
    : output;

  const handleDiscard = () => {
    if (id) {
      sessionStorage.removeItem(`verniq.pending.${id}`);
      queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
    }
    setLocation("/create");
  };

  const handleShareToFeed = async () => {
    if (sharingToFeed || sharedToFeed) return;
    setSharingToFeed(true);
    try {
      await shareFeedPost.mutateAsync({
        data: {
          idea: data.idea,
          platform: platform as FeedPlatform,
          content: fullContent,
          voice_match: data.voiceMatch,
        },
      });
      setSharedToFeed(true);
      queryClient.invalidateQueries({ queryKey: getListFeedPostsQueryKey() });
    } catch {
      // silent — user can retry
    } finally {
      setSharingToFeed(false);
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setLocation("/create")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xl">{platformInfo.icon}</span>
            <h1 className="text-2xl font-black font-sans">{platformInfo.label}</h1>
          </div>
          <p className="text-xs font-mono text-muted-foreground pl-6 truncate max-w-sm">"{data.idea}"</p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={data.voiceMatch} />
          <div className="flex flex-col gap-2">
            {!saved && (
              <button
                onClick={() => { setSaved(true); }}
                className="px-5 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-none hover:bg-primary/90 transition-colors"
              >
                Save draft →
              </button>
            )}
            {saved && (
              <span className="text-xs font-mono text-primary px-5 py-2 border border-primary/30">Saved ✓</span>
            )}
            <button
              onClick={handleDiscard}
              className="px-5 py-2 border border-border text-sm font-bold rounded-none hover:bg-muted transition-colors text-muted-foreground"
            >
              New idea
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isThreadFormat ? (
        <div className="space-y-3">
          {output && (
            <div className="border border-border bg-card p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {platform === "podcast" ? "Intro Script" : platform === "newsletter" ? "Subject + Preview" : "Opening"}
                </span>
                <CopyButton text={output} />
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{output}</pre>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {platform === "twitter" ? "Thread" : platform === "podcast" ? "Talking Points" : "Body"}
            </span>
            <CopyButton text={parts!.join("\n\n")} />
          </div>
          <div className="space-y-2">
            {parts!.map((part, idx) => (
              <div key={idx} className="border border-border bg-card p-4 flex gap-3 group">
                {platform === "twitter" && (
                  <span className="text-primary font-black font-mono text-sm flex-shrink-0 w-6">{idx + 1}/</span>
                )}
                {platform !== "twitter" && (
                  <span className="text-primary font-mono text-sm flex-shrink-0 w-5">{idx + 1}.</span>
                )}
                <p className="text-sm leading-relaxed flex-1">{part.replace(/^\d+\/\s*/, "")}</p>
                <CopyButton text={part} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Script</span>
            <CopyButton text={output} />
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground">
            {output}
          </pre>
        </div>
      )}

      {/* Share & Distribute panel */}
      <div className="mt-8 pt-6 border-t border-border">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Share &amp; Distribute
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Share to Verniq feed */}
          <button
            onClick={handleShareToFeed}
            disabled={sharingToFeed || sharedToFeed}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-none transition-colors ${
              sharedToFeed
                ? "border border-primary/30 text-primary bg-primary/5 cursor-default"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {sharedToFeed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Shared to Feed ✓
              </>
            ) : sharingToFeed ? (
              <>
                <Share2 className="w-4 h-4 animate-pulse" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share to Verniq Feed
              </>
            )}
          </button>

          {/* Social share buttons */}
          {SOCIAL_SHARE_PLATFORMS.map(sp => (
            <a
              key={sp.id}
              href={sp.getUrl(fullContent)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-border hover:border-primary text-muted-foreground hover:text-foreground rounded-none transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {sp.label}
            </a>
          ))}
        </div>
        {sharedToFeed && (
          <p className="text-xs font-mono text-muted-foreground mt-3">
            Your post is live on the{" "}
            <button onClick={() => setLocation("/feed")} className="text-primary underline">
              Verniq feed
            </button>
            . Others can discover it and use your Voice DNA.
          </p>
        )}
      </div>

      {/* Regenerate */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setLocation("/create")}
          className="px-6 py-3 border border-primary text-primary text-sm font-bold rounded-none hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Generate another →
        </button>
      </div>
    </div>
  );
}
