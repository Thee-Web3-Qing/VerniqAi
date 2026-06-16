import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useCreateDraft, getListDraftsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Results() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [data, setData] = useState<any>(null);

  const createDraft = useCreateDraft();

  useEffect(() => {
    if (id) {
      const stored = sessionStorage.getItem(`verniq.pending.${id}`);
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        setLocation("/create");
      }
    }
  }, [id, setLocation]);

  const handleSave = () => {
    if (!data) return;
    createDraft.mutate({
      data: {
        idea: data.idea,
        tiktok: data.tiktok,
        twitter: data.twitter,
        voice_match: data.voiceMatch
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
        sessionStorage.removeItem(`verniq.pending.${id}`);
        setLocation("/history");
      }
    });
  };

  const handleDiscard = () => {
    if (id) sessionStorage.removeItem(`verniq.pending.${id}`);
    setLocation("/create");
  };

  if (!data) return <div className="p-8 text-center">Loading results...</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <header className="mb-12 border-b border-border pb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black font-sans mb-2">Generated Output</h1>
          <p className="text-muted-foreground font-mono text-sm">Voice match: {data.voiceMatch}%</p>
        </div>
        <div className="flex gap-4">
          <button 
            data-testid="button-discard"
            onClick={handleDiscard}
            className="px-4 py-2 border border-border rounded text-sm hover:bg-muted transition-colors"
          >
            Discard
          </button>
          <button 
            data-testid="button-save-draft"
            onClick={handleSave}
            disabled={createDraft.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {createDraft.isPending ? "Saving..." : "Save Draft →"}
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-card border border-border p-6 rounded-lg">
          <h2 className="text-xl font-black mb-4 font-sans text-primary">TikTok Script</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-card-foreground">
            {data.tiktok}
          </pre>
        </section>

        <section className="bg-card border border-border p-6 rounded-lg">
          <h2 className="text-xl font-black mb-4 font-sans text-primary">Twitter Thread</h2>
          <div className="space-y-4">
            {data.twitter?.map((tweet: string, idx: number) => (
              <div key={idx} className="p-4 border border-border/50 rounded bg-background/50 text-sm leading-relaxed">
                {tweet}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}