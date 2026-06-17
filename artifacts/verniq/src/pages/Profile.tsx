import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Brain, Edit3, Globe, Clock, Zap, MessageSquare, Mic } from "lucide-react";

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
  return (
    <span className="px-2 py-1 border border-primary/40 text-primary text-xs font-mono">{text}</span>
  );
}

export default function Profile() {
  const { data: profile, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setNiche(profile.niche ?? "");
      setIsPublic(profile.is_public_creator);
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;

  const dna = profile?.voice_dna;
  const initials = (displayName || "U").slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-4xl">
      {/* Header */}
      <header className="mb-10 border-b border-border pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-black font-sans">{displayName || "Your Profile"}</h1>
            {niche && <p className="text-sm text-muted-foreground font-mono mt-0.5">{niche}</p>}
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
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">Niche</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Tech, Finance, Lifestyle, Fitness"
                  className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-10 h-5 relative transition-colors ${isPublic ? "bg-primary" : "bg-border"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm font-bold">List in Creator Marketplace</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
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
                <button
                  onClick={() => setLocation("/create")}
                  className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group"
                >
                  <Zap className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">Create content</div>
                  <div className="text-xs text-muted-foreground font-mono">7 platforms</div>
                </button>
                <button
                  onClick={() => setLocation("/history")}
                  className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group"
                >
                  <Clock className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">View history</div>
                  <div className="text-xs text-muted-foreground font-mono">All drafts</div>
                </button>
                <button
                  onClick={() => setLocation("/creators")}
                  className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group"
                >
                  <Globe className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-bold">Creator marketplace</div>
                  <div className="text-xs text-muted-foreground font-mono">Browse voices</div>
                </button>
                <button
                  onClick={() => setLocation("/onboarding")}
                  className="p-4 border border-border bg-card hover:border-primary transition-colors text-left group"
                >
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
                {/* Summary */}
                <p className="text-sm italic text-muted-foreground leading-relaxed">"{dna.summary}"</p>

                {/* Bars */}
                <div className="space-y-3">
                  <VoiceBar label="Formality" value={dna.formalityScore} max={10} />
                  <VoiceBar
                    label="Energy"
                    value={dna.energy === "high" ? 9 : dna.energy === "punchy" ? 8 : dna.energy === "balanced" ? 5 : 3}
                    max={10}
                  />
                </div>

                {/* Traits grid */}
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

                {/* Signature phrases */}
                {dna.signaturePhrases.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Signature phrases</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dna.signaturePhrases.slice(0, 6).map((p) => (
                        <Tag key={p} text={p} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs font-mono text-muted-foreground pt-2 border-t border-border">
                  Last trained {new Date(dna.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No Voice DNA yet.</p>
                <button
                  onClick={() => setLocation("/onboarding")}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-none hover:bg-primary/90 transition-colors"
                >
                  Build Voice DNA →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
