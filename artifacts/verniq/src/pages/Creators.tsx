import { useListCreators } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Creators() {
  const { data: creators, isLoading } = useListCreators();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading marketplace...</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black font-sans mb-4">Creator Marketplace</h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Borrow established Voice DNAs for your own content. Find a creator whose style matches the vibe you're looking for.
        </p>
      </header>

      {(!creators || creators.length === 0) ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
          <p className="text-muted-foreground font-mono">No public creators available yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map(creator => (
            <Link key={creator.id} href={`/creators/${creator.id}`} className="block group">
              <div className="p-6 border border-border bg-card rounded-lg hover:border-primary transition-colors h-full flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden border border-border">
                    {creator.avatar_url && <img src={creator.avatar_url} alt={creator.display_name || "Creator"} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {creator.display_name || "Anonymous Creator"}
                    </h3>
                    {creator.niche && <p className="text-xs text-muted-foreground font-mono">{creator.niche}</p>}
                  </div>
                </div>
                
                {creator.bio && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{creator.bio}</p>}
                
                <div className="mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Voice DNA:</span>
                    <span className="text-primary">{creator.voice_dna ? 'Active' : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}