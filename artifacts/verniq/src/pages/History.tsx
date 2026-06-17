import { useListDrafts } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export default function History() {
  const { data: drafts, isLoading } = useListDrafts();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading history...</div>;

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-4xl">
      <header className="mb-12 border-b border-border pb-8">
        <h1 className="text-4xl font-black font-sans mb-2">History</h1>
        <p className="text-muted-foreground font-mono text-sm">Your previously generated and saved ideas.</p>
      </header>

      {(!drafts || drafts.length === 0) ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/50">
          <p className="text-muted-foreground font-mono mb-6">No drafts saved yet.</p>
          <button 
            onClick={() => setLocation("/create")}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors"
          >
            Create New →
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {drafts.map(draft => (
            <div key={draft.id} className="p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => setLocation(`/drafts/${draft.id}`)}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg line-clamp-1 flex-1">{draft.idea}</h3>
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded ml-4">
                  {draft.voice_match}% Match
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {new Date(draft.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}