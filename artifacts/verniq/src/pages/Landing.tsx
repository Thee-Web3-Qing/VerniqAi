import { useLocation } from "wouter";
import { Check, Mic, Users, ToggleRight, ArrowRight } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="relative">
      {/* Hero */}
      <div className="container mx-auto px-6 md:px-8 pt-20 pb-24 max-w-6xl">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs font-mono mb-10 font-bold tracking-widest uppercase border border-border bg-card px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
          VOICE DNA · MARKETPLACE · V0.1 BETA
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-end">
          <div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-sans font-black tracking-tighter leading-[1.0] mb-8">
              One idea.<br/><span className="text-primary">Your voice.</span><br/>Every platform.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
              Verniq learns how you write or speak, then repurposes any idea into TikTok
              scripts and Twitter threads that sound like <em>you</em> — not generic AI.
              New to content? Borrow a creator's proven voice from the marketplace and
              learn as you ship.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="text-xs font-bold border border-border px-3 py-1 bg-card rounded-none">📱 TikTok Creators</span>
              <span className="text-xs font-bold border border-border px-3 py-1 bg-card rounded-none">🐦 Twitter Writers</span>
              <span className="text-xs font-bold border border-border px-3 py-1 bg-card rounded-none">🎙 Podcasters</span>
              <span className="text-xs font-bold border border-border px-3 py-1 bg-card rounded-none">🧠 Coaches</span>
              <span className="text-xs font-bold border border-border px-3 py-1 bg-card rounded-none">📣 Marketers</span>
            </div>
            
          </div>
          <div className="flex flex-col gap-6 md:items-start md:justify-end md:pb-2">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <button
                data-testid="button-get-started"
                onClick={() => setLocation("/auth#signup")}
                className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-none font-bold text-base tracking-wide transition-all flex items-center justify-center gap-2"
              >
                Create your voice DNA <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLocation("/creators")}
                className="w-full md:w-auto bg-transparent text-foreground border border-border hover:border-primary/50 hover:bg-secondary/30 px-8 py-4 rounded-none font-bold text-base tracking-wide transition-all flex items-center justify-center gap-2"
              >
                Browse creator voices <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="border border-border bg-card p-6 w-full rounded-none">
              <div className="text-xs font-mono font-bold text-primary mb-4 tracking-widest">FREE DURING EARLY ACCESS</div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Voice DNA</span>
                <span className="font-mono text-muted-foreground">Unlimited</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">TikTok Scripts</span>
                <span className="font-mono text-muted-foreground">Unlimited</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Twitter Threads</span>
                <span className="font-mono text-muted-foreground">Unlimited</span>
              </div>
              <p className="text-xs text-muted-foreground">After launch, limits apply. Build your voice before then.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-t border-border bg-background">
        <div className="container mx-auto px-6 md:px-8 py-24 max-w-6xl">
          <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase mb-12">
            HOW IT WORKS
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-black mb-4">01. Teach it your voice</h3>
              <p className="text-muted-foreground leading-relaxed">
                Paste samples of your writing or drop a video URL. We transcribe, analyze your tone, pacing, and signature phrases.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-black mb-4">02. Give it an idea</h3>
              <p className="text-muted-foreground leading-relaxed">
                One rough sentence. A tweet you saw. A thought in the shower. Verniq turns it into platform-ready content.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-black mb-4">03. Publish in your voice</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get a TikTok hook + script and a Twitter thread. Both sound unmistakably like you — not generic AI.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Preview Section */}
      <div className="border-t border-border bg-background py-24">
        <div className="container mx-auto px-6 md:px-8 max-w-6xl">
           <div className="grid md:grid-cols-2 gap-8">
              {/* TikTok Card */}
              <div className="border border-border bg-card p-8 rounded-none">
                 <div className="text-xs font-mono font-bold text-muted-foreground mb-6 uppercase tracking-widest flex justify-between">
                   <span>TIKTOK SCRIPT</span>
                   <span className="text-primary bg-primary/10 px-2 py-0.5">Voice Match: 94%</span>
                 </div>
                 <div className="space-y-4 font-sans text-sm">
                   <div>
                     <span className="font-bold block mb-1">Hook:</span>
                     <p>"Nobody tells you this about building in public..."</p>
                   </div>
                   <div className="py-2 opacity-50 space-y-2">
                     <div className="h-4 bg-muted w-full rounded-none"></div>
                     <div className="h-4 bg-muted w-5/6 rounded-none"></div>
                     <div className="h-4 bg-muted w-4/6 rounded-none"></div>
                   </div>
                   <div>
                     <span className="font-bold block mb-1">CTA:</span>
                     <p>"If this hit different, follow for part 2"</p>
                   </div>
                 </div>
              </div>
              
              {/* Twitter Thread Card */}
              <div className="border border-border bg-card p-8 rounded-none">
                 <div className="text-xs font-mono font-bold text-muted-foreground mb-6 uppercase tracking-widest">
                   TWITTER THREAD — 6 TWEETS
                 </div>
                 <div className="space-y-4 font-sans text-sm">
                   <div className="flex gap-4">
                     <span className="font-mono text-muted-foreground">1/</span>
                     <p>Nobody tells you this about building in public. It's not just about sharing revenue numbers...</p>
                   </div>
                   <div className="flex gap-4 opacity-50">
                     <span className="font-mono text-muted-foreground">2/</span>
                     <div className="flex-1 space-y-2 pt-1">
                       <div className="h-4 bg-muted w-full rounded-none"></div>
                       <div className="h-4 bg-muted w-3/4 rounded-none"></div>
                     </div>
                   </div>
                   <div className="flex gap-4 opacity-50">
                     <span className="font-mono text-muted-foreground">3/</span>
                     <div className="flex-1 space-y-2 pt-1">
                       <div className="h-4 bg-muted w-5/6 rounded-none"></div>
                     </div>
                   </div>
                   <div className="pt-4 border-t border-border mt-4">
                     <span className="text-primary font-bold">View full thread →</span>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* For beginners / For creators */}
      <div className="border-t border-border">
        <div className="container mx-auto px-6 md:px-8 max-w-6xl">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* For beginners */}
            <div className="py-24 md:pr-16">
              <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase mb-6">
                For beginners
              </div>
              <h2 className="text-4xl font-sans font-black tracking-tight mb-4 leading-tight">
                Don't have a voice yet?<br />Borrow one that works.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Just starting out? Pick a creator from the marketplace whose style
                matches the kind of content you want to make. Generate in their voice
                while you find your own — and see exactly what makes great content tick.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  One-click generate in any premium creator's voice
                </li>
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  See the exact hook, structure, and CTA they use
                </li>
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  Graduate to your own DNA whenever you're ready
                </li>
              </ul>
            </div>

            {/* For creators */}
            <div className="py-24 md:pl-16">
              <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase mb-6">
                For creators
              </div>
              <h2 className="text-4xl font-sans font-black tracking-tight mb-4 leading-tight">
                Already have a voice?<br />License it.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Upload your Voice DNA, flip a switch, and become a premium voice in the
                marketplace. Earn whenever beginners generate in your style. Your bio,
                niche, and signature phrases stay attached to every output.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <Mic className="w-5 h-5 text-primary flex-shrink-0" />
                  3-minute onboarding from writing or a talking-head video
                </li>
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <Users className="w-5 h-5 text-primary flex-shrink-0" />
                  Public creator page with bio + niche + sample outputs
                </li>
                <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <ToggleRight className="w-5 h-5 text-primary flex-shrink-0" />
                  You stay in control — toggle public off any time
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="border-t border-border bg-card py-24 text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <h2 className="text-5xl font-sans font-black mb-4">Your voice. Ready in 3 minutes.</h2>
          <p className="text-lg text-muted-foreground mb-8">No writing prompts. No templates. Just you.</p>
          
          <button
            onClick={() => setLocation("/auth#signup")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-5 rounded-none font-bold text-lg tracking-wide transition-all mb-4 inline-flex items-center gap-2"
          >
            Start for free <ArrowRight className="w-5 h-5" />
          </button>
          
          <div className="mt-4">
            <button
              onClick={() => setLocation("/auth")}
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold"
            >
              Already have an account? Sign in →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
