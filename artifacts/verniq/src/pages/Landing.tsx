import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="container mx-auto px-4 py-24 max-w-5xl relative">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs font-mono mb-8 font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          VOICE DNA · MARKETPLACE · V0.1 BETA
        </div>

        <h1 className="text-6xl md:text-8xl font-sans font-black tracking-tighter mb-8 leading-[1.1]">
          One idea. <span className="text-primary">Your voice.</span><br/>Every platform.
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 leading-relaxed font-sans max-w-2xl">
          Verniq learns your exact writing style—your Voice DNA—and repurposes one idea into high-performing TikTok scripts and Twitter threads.
        </p>
        
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <button 
            data-testid="button-get-started"
            onClick={() => setLocation("/create")}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded font-bold text-lg tracking-wide transition-all"
          >
            Create your voice DNA →
          </button>
          <button 
            onClick={() => setLocation("/creators")}
            className="w-full sm:w-auto bg-transparent text-foreground border border-border hover:bg-secondary/50 px-8 py-4 rounded font-bold text-lg tracking-wide transition-all"
          >
            Browse creator voices →
          </button>
        </div>
      </div>

      <div className="mt-40 pt-16 border-t border-border grid sm:grid-cols-3 gap-12 text-left">
        <div>
          <div className="text-primary font-mono font-bold mb-4 text-sm">01. Extract</div>
          <h3 className="font-sans font-black text-2xl mb-3">Define your DNA</h3>
          <p className="text-base text-muted-foreground leading-relaxed">Upload existing writing or record a brain dump. Verniq maps your unique syntax and pacing.</p>
        </div>
        <div>
          <div className="text-primary font-mono font-bold mb-4 text-sm">02. Generate</div>
          <h3 className="font-sans font-black text-2xl mb-3">Multichannel Output</h3>
          <p className="text-base text-muted-foreground leading-relaxed">One idea becomes a 6-tweet thread and a TikTok script. Perfectly tailored to your voice.</p>
        </div>
        <div>
          <div className="text-primary font-mono font-bold mb-4 text-sm">03. License</div>
          <h3 className="font-sans font-black text-2xl mb-3">Creator Marketplace</h3>
          <p className="text-base text-muted-foreground leading-relaxed">List your Voice DNA publicly. Let others generate content using your proven style.</p>
        </div>
      </div>
    </div>
  );
}