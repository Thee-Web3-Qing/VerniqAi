import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useUpdateMyProfile, useListMyOrgs } from "@workspace/api-client-react";
import type { SocialConnection, SocialPlatformId } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Brain, Edit3, Globe, Clock, Zap, MessageSquare, Mic, DollarSign, CheckCircle2, CheckCircle, Building2, ExternalLink } from "lucide-react";

function VoiceBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-bold">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-border w-full">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return <span className="px-2 py-1 border border-primary/40 text-primary text-xs font-mono">{text}</span>;
}

const SOCIAL_PLATFORMS: { id: SocialPlatformId; label: string; icon: string }[] = [
  { id: "tiktok", label: "TikTok", icon: "📱" },
  { id: "twitter", label: "Twitter / X", icon: "𝕏" },
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "youtube", label: "YouTube", icon: "▶" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "podcast", label: "Podcast", icon: "🎙" },
];

export default function Profile() {
  const { data: profile, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const { data: myOrgs } = useListMyOrgs();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saved, setSaved] = useState(false);

  const [socialConns, setSocialConns] = useState<SocialConnection[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [pricePerGen, setPricePerGen] = useState(50);
  const [creatorSaved, setCreatorSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setNiche(profile.niche ?? "");
      setIsPublic(profile.is_public_creator);
      setSocialConns((profile.social_connections as SocialConnection[]) || []);
      setWalletAddress(profile.wallet_address ?? "");
      setPricePerGen(profile.price_per_generation || 50);
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      { data: { display_name: displayName, bio, niche, is_public_creator: isPublic } },
      {
        onSuccess: () => {
          setSaved(true);
          setEditing(false);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  const updateSocialConn = (platform: SocialPlatformId, field: "username" | "followerCount", value: string | number) => {
    setSocialConns(prev => {
      const exists = prev.find(c => c.platform === platform);
      if (exists) return prev.map(c => c.platform === platform ? { ...c, [field]: value } : c);
      const blank: SocialConnection = { platform, username: "", followerCount: 0 };
      return [...prev, { ...blank, [field]: value }];
    });
  };

  const handleCreatorSave = () => {
    const filteredSocials = socialConns.filter(c => c.username.trim() || c.followerCount > 0);
    updateProfile.mutate(
      {
        data: {
          social_connections: filteredSocials,
          wallet_address: walletAddress.trim() || null,
          price_per_generation: pricePerGen,
          is_public_creator: isPublic,
        },
      },
      {
        onSuccess: () => {
          setCreatorSaved(true);
          setTimeout(() => setCreatorSaved(false), 2500);
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;

  const dna = profile?.voice_dna;
  const initials = (displayName || "U").slice(0, 2).toUpperCase();
  const creatorEligible = socialConns.some(c => c.followerCount >= 5000);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-12">
      {/* Header */}
      <header className="mb-10 border-b border-border pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-black font-sans">{displayName || "Your Profile"}</h1>
            {niche && <p className="text-sm text-muted-foreground font-mono mt-0.5">{niche}</p>}
            {profile?.language && profile.language !== "english" && (
              <p className="text-xs font-mono text-primary mt-0.5 capitalize">{profile.language}</p>
            )}
            {isPublic && (
              <div className="flex items-center gap-1 mt-1">
                <Globe className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary font-mono">Listed in Creator Marketplace</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary text-sm font-bold transition-colors rounded-none"
          >
            <Edit3 className="w-4 h-4" />
            {editing ? "Cancel" : "Edit Profile"}
          </button>
          <button
            onClick={() => signOut().then(() => setLocation("/"))}
            className="px-4 py-2 border border-border hover:border-destructive text-sm font-bold text-muted-foreground hover:text-destructive transition-colors rounded-none"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_340px] gap-8">
        {/* Left: edit form or stats */}
        <div className="space-y-8">
          {editing ? (
            <div className="border border-border bg-card p-6 space-y-5">
              <h2 className="text-lg font-black font-sans">Edit Profile</h2>
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Niche</label>
                <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Tech, Finance, Lifestyle, Fitness"
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={updateProfile.isPending}
                  className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {updateProfile.isPending ? "Saving..." : "Save changes →"}
                </button>
                {saved && <span className="text-sm text-primary font-mono self-center">Saved ✓</span>}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {bio && (
                <div className="border border-border bg-card p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{bio}</p>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setLocation("/create")} className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group">
                  <Zap className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">Create content</div>
                  <div className="text-xs text-muted-foreground font-mono">7 platforms</div>
                </button>
                <button onClick={() => setLocation("/history")} className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group">
                  <Clock className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">View history</div>
                  <div className="text-xs text-muted-foreground font-mono">All drafts</div>
                </button>
                <button onClick={() => setLocation("/creators")} className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group">
                  <Globe className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">Creator marketplace</div>
                  <div className="text-xs text-muted-foreground font-mono">Browse voices</div>
                </button>
                <button onClick={() => setLocation("/onboarding")} className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group">
                  <Mic className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">Re-train Voice DNA</div>
                  <div className="text-xs text-muted-foreground font-mono">Add new samples</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Voice DNA panel */}
        <div className="space-y-4">
          <div className="border border-primary/30 bg-card sticky top-24">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Voice DNA</h2>
              {dna && (
                <span className="ml-auto text-xs font-mono text-muted-foreground">
                  {dna.source === "video" ? "🎙 audio" : "✍ text"}
                </span>
              )}
            </div>

            {dna ? (
              <div className="p-5 space-y-6">
                <p className="text-sm italic text-muted-foreground leading-relaxed">"{dna.summary}"</p>
                <div className="space-y-3">
                  <VoiceBar label="Formality" value={dna.formalityScore} max={10} />
                  <VoiceBar
                    label="Energy"
                    value={dna.energy === "high" ? 9 : dna.energy === "punchy" ? 8 : dna.energy === "balanced" ? 5 : 3}
                    max={10}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm font-mono">
                  {[
                    { label: "Tone", value: dna.tone },
                    { label: "Energy", value: dna.energy },
                    { label: "Hook", value: dna.hookStyle },
                    { label: "Closing", value: dna.closingStyle },
                    ...(dna.emotions ? [{ label: "Emotions", value: dna.emotions }] : []),
                    ...(dna.charisma ? [{ label: "Charisma", value: dna.charisma }] : []),
                    ...(dna.contentStyle ? [{ label: "Style", value: dna.contentStyle }] : []),
                    ...(dna.pacing ? [{ label: "Pacing", value: dna.pacing }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <span className="text-foreground text-xs font-bold capitalize text-right max-w-[160px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
                {dna.signaturePhrases.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Signature phrases</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dna.signaturePhrases.slice(0, 6).map((p) => <Tag key={p} text={p} />)}
                    </div>
                  </div>
                )}
                <div className="text-xs font-mono text-muted-foreground pt-2 border-t border-border space-y-1.5">
                  <div>Last trained {new Date(dna.lastUpdated).toLocaleDateString()}</div>
                  {profile?.voice_dna_0g_hash && (
                    <a
                      href="https://scan-testnet.0g.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-green-500 hover:underline"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Stored on 0G blockchain
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No Voice DNA yet.</p>
                <button onClick={() => setLocation("/onboarding")}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-none hover:bg-primary/90 transition-colors">
                  Build Voice DNA →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creator Studio */}
      <div className="mt-10 border border-border bg-card">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <DollarSign className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Creator Studio</h2>
          {creatorEligible && (
            <span className="text-xs font-mono font-bold text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5">⭐ Creator Eligible</span>
          )}
          {profile?.is_public_creator && (
            <span className="text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">Listed</span>
          )}
          {profile?.total_generations_sold > 0 && (
            <span className="ml-auto text-xs font-mono text-muted-foreground">{profile.total_generations_sold} generations sold</span>
          )}
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Connect your socials to verify 5,000+ followers. Once eligible, set your wallet address and price per generation to earn from your Voice DNA.
          </p>

          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Connected Socials</label>
            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((sp) => {
                const conn = socialConns.find(c => c.platform === sp.id);
                return (
                  <div key={sp.id} className="flex items-center gap-3">
                    <span className="w-32 text-sm font-mono text-muted-foreground flex-shrink-0">{sp.icon} {sp.label}</span>
                    <input type="text" placeholder="@username" value={conn?.username || ""}
                      onChange={(e) => updateSocialConn(sp.id, "username", e.target.value)}
                      className="flex-1 bg-background border border-border p-2 text-sm focus:outline-none focus:border-primary rounded-none" />
                    <input type="number" placeholder="Followers" value={conn?.followerCount || ""}
                      onChange={(e) => updateSocialConn(sp.id, "followerCount", Number(e.target.value))}
                      className="w-32 bg-background border border-border p-2 text-sm focus:outline-none focus:border-primary rounded-none" />
                    {(conn?.followerCount ?? 0) >= 5000 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            {!creatorEligible && (
              <p className="text-xs font-mono text-muted-foreground border border-dashed border-border p-3">
                Need at least one platform with 5,000+ followers to unlock wallet & pricing.
              </p>
            )}
          </div>

          {creatorEligible && (
            <div className="space-y-4 border-t border-border pt-6">
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Wallet Address (any chain)</label>
                <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="ETH / SOL / USDT TRC-20 / BTC address"
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none font-mono" />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Price per Generation (USD)</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground">$</span>
                  <input type="number" value={(pricePerGen / 100).toFixed(2)}
                    onChange={(e) => { const val = Math.round(parseFloat(e.target.value || "0") * 100); setPricePerGen(Math.max(10, Math.min(1000, val))); }}
                    step="0.10" min="0.10" max="10.00"
                    className="w-36 bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none font-mono" />
                  <span className="text-xs font-mono text-muted-foreground">per content piece</span>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => setIsPublic(!isPublic)}
                  className={`w-10 h-5 relative transition-colors flex-shrink-0 mt-0.5 ${isPublic ? "bg-primary" : "bg-border"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <div className="text-sm font-bold">List in Creator Marketplace</div>
                  <div className="text-xs text-muted-foreground font-mono">Buyers find and pay to use your Voice DNA</div>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleCreatorSave} disabled={updateProfile.isPending}
              className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {updateProfile.isPending ? "Saving..." : "Save Creator Settings →"}
            </button>
            {creatorSaved && <span className="text-sm text-green-500 font-mono">Saved ✓</span>}
          </div>
        </div>
      </div>

      {/* Brand Voice Teams */}
      <div className="mt-10 border border-border bg-card">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black font-sans text-primary uppercase tracking-wider">Brand Voice Teams</h2>
          {myOrgs && myOrgs.length > 0 && (
            <span className="ml-auto text-xs font-mono text-muted-foreground">{myOrgs.length} team{myOrgs.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="p-6 space-y-3">
          {myOrgs && myOrgs.length > 0 ? (
            <>
              {myOrgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => setLocation(`/org/${org.slug}`)}
                  className="w-full flex items-center gap-3 p-3 border border-border hover:border-primary transition-colors text-left rounded-none"
                >
                  <div className="w-9 h-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{org.name}</div>
                    <div className="text-xs font-mono text-muted-foreground capitalize">
                      {org.role} · {org.voice_dna ? "Brand voice built" : "No brand voice yet"}
                    </div>
                  </div>
                  {org.voice_dna_0g_hash && (
                    <span className="text-xs font-mono text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5 flex-shrink-0">On-chain</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-mono">No teams yet. Create one to blend your team's voices into a single brand identity.</p>
          )}
          <button
            onClick={() => setLocation("/org/new")}
            className="w-full py-3 border border-dashed border-border hover:border-primary text-sm font-bold transition-colors rounded-none text-muted-foreground hover:text-foreground"
          >
            + Create a brand voice team
          </button>
        </div>
      </div>
    </div>
  );
}
