import { useLocation } from "wouter";
import { Check, Mic, Users, ToggleRight } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="relative">
      {/* Hero */}
      <div className="container mx-auto px-6 md:px-8 pt-20 pb-24 max-w-6xl">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs font-mono mb-10 font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
          VOICE DNA · MARKETPLACE · V0.1 BETA
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-end">
          <div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-sans font-black tracking-tighter leading-[1.0] mb-8">
              One idea. <span className="text-primary">Your voice.</span>{" "}
              Every platform.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Verniq learns how you write or speak, then repurposes any idea into TikTok
              scripts and Twitter threads that sound like <em>you</em> — not generic AI.
              New to content? Borrow a creator's proven voice from the marketplace and
              learn as you ship.
            </p>
          </div>
          <div className="flex flex-col gap-4 md:items-start md:justify-end md:pb-2">
            <button
              data-testid="button-get-started"
              onClick={() => setLocation("/auth#signup")}
              className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-lg font-bold text-base tracking-wide transition-all"
            >
              Create your voice DNA →
            </button>
            <button
              onClick={() => setLocation("/creators")}
              className="w-full md:w-auto bg-transparent text-foreground border border-border hover:border-primary/50 hover:bg-secondary/30 px-8 py-4 rounded-lg font-bold text-base tracking-wide transition-all"
            >
              Browse creator voices →
            </button>
          </div>
        </div>
      </div>

      {/* For beginners / For creators */}
      <div className="border-t border-border">
        <div className="container mx-auto px-6 md:px-8 max-w-6xl">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* For beginners */}
            <div className="py-16 md:pr-16">
              <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase mb-6">
                For beginners
              </div>
              <h2 className="text-3xl font-sans font-black tracking-tight mb-4">
                Don't have a voice yet?<br />Borrow one that works.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Just starting out? Pick a creator from the marketplace whose style
                matches the kind of content you want to make. Generate in their voice
                while you find your own — and see exactly what makes great content tick.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  One-click generate in any premium creator's voice
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  See the exact hook, structure, and CTA they use
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Graduate to your own DNA whenever you're ready
                </li>
              </ul>
            </div>

            {/* For creators */}
            <div className="py-16 md:pl-16">
              <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase mb-6">
                For creators
              </div>
              <h2 className="text-3xl font-sans font-black tracking-tight mb-4">
                Already have a voice?<br />License it.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Upload your Voice DNA, flip a switch, and become a premium voice in the
                marketplace. Earn whenever beginners generate in your style. Your bio,
                niche, and signature phrases stay attached to every output.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Mic className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  3-minute onboarding from writing or a talking-head video
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  Public creator page with bio + niche + sample outputs
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ToggleRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  You stay in control — toggle public off any time
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
