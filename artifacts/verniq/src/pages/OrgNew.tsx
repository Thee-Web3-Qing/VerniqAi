import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateOrg } from "@workspace/api-client-react";
import { Building2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function OrgNew() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createOrg = useCreateOrg();

  const previewSlug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleCreate = () => {
    if (!name.trim()) return;
    setError(null);
    createOrg.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: (org) => setLocation(`/org/${org.slug}`),
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message;
          setError(msg ?? "Failed to create organization");
        },
      }
    );
  };

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-12">
      <div className="flex items-center justify-between mb-12">
        <Logo />
        <button
          onClick={() => setLocation("/profile")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to profile
        </button>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black font-sans">Create a Brand Voice</h1>
        </div>
        <p className="text-muted-foreground">
          Teams and agencies can blend multiple Voice DNAs into a single brand identity. Invite your team after creating.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive text-sm font-mono">
          {error}
        </div>
      )}

      <div className="border border-border bg-card p-6 space-y-6">
        <div>
          <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Acme Media, Growth Squad, Studio X"
            className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-primary rounded-none transition-colors"
            autoFocus
          />
          {previewSlug && (
            <p className="text-xs font-mono text-muted-foreground mt-2">
              URL: /org/<span className="text-primary">{previewSlug}</span>-...
            </p>
          )}
        </div>

        <div className="border border-border/50 p-4 bg-background/40 space-y-2">
          <div className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3">What you get</div>
          {[
            "Shared Brand Voice DNA blended from all members",
            "Private invite link for your team",
            "Generate content using the team brand voice",
            "Stored permanently on 0G blockchain",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-primary text-xs mt-0.5">✦</span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || createOrg.isPending}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-black text-base rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createOrg.isPending ? "Creating..." : (
            <>Create Brand Voice <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
