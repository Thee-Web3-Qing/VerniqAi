import { useListCreators } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Creators() {
  const { data: creators, isLoading } = useListCreators();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading marketplace...</div>;

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-6xl">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black font-sans mb-4">Creator Marketplace</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Borrow established Voice DNAs for your own content. Find a creator whose style matches the vibe you're looking for.
        </p>
      </header>

      {/* Cosmetic Filters */}
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
          <p className="text-muted-foreground font-mono">No public creators available yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creators.map(creator => (
            <div key={creator.id} className="p-6 border border-border bg-card rounded-none hover:border-primary transition-colors h-full flex flex-col group">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-none bg-gradient-to-br from-primary/20 to-secondary overflow-hidden border border-border flex-shrink-0">
                  {creator.avatar_url && <img src={creator.avatar_url} alt={creator.display_name || "Creator"} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-black text-xl group-hover:text-primary transition-colors mb-1 line-clamp-1">
                    {creator.display_name || "Anonymous Creator"}
                  </h3>
                  {creator.niche && <span className="text-xs font-bold bg-secondary border border-border px-2 py-0.5 rounded-none">{creator.niche}</span>}
                </div>
              </div>
              
              {creator.bio && <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">{creator.bio}</p>}
              
              <div className="mt-auto pt-6 border-t border-border/50">
                <div className="flex items-center justify-between mb-4 text-xs font-mono">
                  <span className="text-muted-foreground">Followers: <span className="text-foreground">--</span></span>
                  <span className="text-primary bg-primary/10 px-2 py-0.5 font-bold">Voice DNA Active</span>
                </div>
                
                <Link href={`/creators/${creator.id}`} className="w-full block">
                  <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-3 rounded-none font-bold text-sm transition-all">
                    Use this voice →
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
