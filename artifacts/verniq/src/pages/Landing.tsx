import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="container mx-auto px-4 py-32 text-center max-w-4xl relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-primary/20 text-primary text-xs font-mono mb-8 font-bold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Verniq Engine Online
      </div>

      <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6 leading-tight">
        Clone your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">creative mind.</span>
      </h1>
      
      <p className="text-xl text-muted-foreground mb-12 leading-relaxed font-mono max-w-2xl mx-auto">
        Verniq learns your exact writing style—your Voice DNA—and repurposes one idea into high-performing TikTok scripts and Twitter threads.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button 
          data-testid="button-get-started"
          onClick={() => setLocation("/create")}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded font-bold text-lg tracking-wide transition-all shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:shadow-[0_0_40px_rgba(0,255,255,0.4)]"
        >
          Initialize Voice DNA
        </button>
        <button 
          onClick={() => setLocation("/creators")}
          className="w-full sm:w-auto bg-card text-foreground border border-border hover:border-primary/50 px-8 py-4 rounded font-bold text-lg tracking-wide transition-all"
        >
          Browse Marketplace
        </button>
      </div>

      <div className="mt-32 pt-16 border-t border-border grid sm:grid-cols-3 gap-8 text-left">
        <div>
          <div className="text-primary font-mono font-bold mb-2">01. Extract</div>
          <h3 className="font-serif font-bold text-lg mb-2">Define your DNA</h3>
          <p className="text-sm text-muted-foreground">Upload existing writing or record a brain dump. Verniq maps your unique syntax and pacing.</p>
        </div>
        <div>
          <div className="text-primary font-mono font-bold mb-2">02. Generate</div>
          <h3 className="font-serif font-bold text-lg mb-2">Multichannel Output</h3>
          <p className="text-sm text-muted-foreground">One idea becomes a 6-tweet thread and a TikTok script. Perfectly tailored to your voice.</p>
        </div>
        <div>
          <div className="text-primary font-mono font-bold mb-2">03. License</div>
          <h3 className="font-serif font-bold text-lg mb-2">Creator Marketplace</h3>
          <p className="text-sm text-muted-foreground">List your Voice DNA publicly. Let others generate content using your proven style.</p>
        </div>
      </div>
    </div>
  );
}