import { useState, useEffect } from "react";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";

export default function Profile() {
  const { data: profile, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setNiche(profile.niche || "");
      setIsPublic(profile.is_public_creator);
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      data: {
        display_name: displayName,
        bio,
        niche,
        is_public_creator: isPublic
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl grid md:grid-cols-[1fr_300px] gap-8">
      <div>
        <header className="mb-8 border-b border-border pb-4">
          <h1 className="text-4xl font-black font-sans">Profile Settings</h1>
        </header>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">Display Name</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-background border border-border p-3 rounded text-sm focus:outline-none focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              className="w-full bg-background border border-border p-3 rounded text-sm focus:outline-none focus:border-primary h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Niche</label>
            <input 
              type="text" 
              value={niche} 
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Tech, Marketing, Lifestyle"
              className="w-full bg-background border border-border p-3 rounded text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-3 p-4 border border-border bg-card rounded">
            <input 
              type="checkbox" 
              id="isPublic"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
            <label htmlFor="isPublic" className="text-sm font-bold select-none cursor-pointer">
              List my profile in the Creator Marketplace
            </label>
          </div>

          <button 
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save Profile →"}
          </button>
        </div>
      </div>

      <div>
        <div className="bg-card border border-border p-6 rounded-lg sticky top-24">
          <h2 className="text-lg font-black font-sans mb-4 pb-2 border-b border-border/50 text-primary">Voice DNA Summary</h2>
          {profile?.voice_dna ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground italic">"{profile.voice_dna.summary}"</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tone</span>
                  <span className="text-foreground">{profile.voice_dna.tone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="text-foreground">{profile.voice_dna.energy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formality</span>
                  <span className="text-foreground">{profile.voice_dna.formalityScore}/10</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-mono">Voice DNA not initialized yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}