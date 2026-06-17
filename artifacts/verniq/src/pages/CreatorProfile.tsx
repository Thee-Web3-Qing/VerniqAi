import { useGetCreator } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";

export default function CreatorProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: creator, isLoading } = useGetCreator(id || "");

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
  if (!creator) return <div className="p-8 text-center text-muted-foreground font-mono">Creator not found.</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl grid md:grid-cols-[1fr_350px] gap-8">
      <div>
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
          <div className="w-24 h-24 rounded-full bg-secondary overflow-hidden border-2 border-primary/20">
            {creator.avatar_url && <img src={creator.avatar_url} alt={creator.display_name || "Creator"} className="w-full h-full object-cover" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold font-serif mb-1">{creator.display_name || "Anonymous Creator"}</h1>
            <div className="flex gap-3 text-sm font-mono text-muted-foreground">
              {creator.niche && <span>{creator.niche}</span>}
              {creator.follower_count > 0 && <span>• {creator.follower_count.toLocaleString()} followers</span>}
            </div>
          </div>
        </div>

        {creator.bio && (
          <section className="mb-8">
            <h2 className="text-xl font-bold font-serif mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed">{creator.bio}</p>
          </section>
        )}
      </div>

      <div>
        <div className="bg-card border border-border p-6 rounded-lg sticky top-24">
          <h2 className="text-lg font-bold font-serif mb-4 pb-2 border-b border-border/50 text-primary">Voice DNA</h2>
          {creator.voice_dna ? (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground italic">"{creator.voice_dna.summary}"</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Tone</span>
                  <span className="text-foreground capitalize">{creator.voice_dna.tone}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="text-foreground capitalize">{creator.voice_dna.energy}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Hook Style</span>
                  <span className="text-foreground capitalize">{creator.voice_dna.hookStyle}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Closing</span>
                  <span className="text-foreground capitalize">{creator.voice_dna.closingStyle}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  // In a real app we'd load this DNA into the session for creating
                  setLocation("/create");
                }}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 mt-4"
              >
                Use this Voice DNA
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-mono">This creator has not exposed their Voice DNA.</p>
          )}
        </div>
      </div>
    </div>
  );
}