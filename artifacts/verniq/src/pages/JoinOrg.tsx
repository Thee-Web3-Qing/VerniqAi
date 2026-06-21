import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useJoinOrg } from "@workspace/api-client-react";
import { Building2, CheckCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function JoinOrg() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const [joined, setJoined] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinOrg = useJoinOrg();

  useEffect(() => {
    if (!code) return;
    joinOrg.mutate(
      { data: { inviteCode: code } },
      {
        onSuccess: (result) => {
          if (result.already_member) {
            setAlreadyMember(true);
            setTimeout(() => setLocation(`/org/${result.slug}`), 1500);
          } else {
            setJoined(true);
            setOrgName(result.name ?? null);
            setTimeout(() => setLocation(`/org/${result.slug}`), 2000);
          }
        },
        onError: () => {
          setError("Invalid or expired invite link.");
        },
      }
    );
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <Logo />

        {joinOrg.isPending && (
          <div className="border border-border bg-card p-8 space-y-4">
            <Building2 className="w-10 h-10 text-primary mx-auto animate-pulse" />
            <p className="text-sm font-mono text-muted-foreground">Joining organization...</p>
          </div>
        )}

        {(joined || alreadyMember) && (
          <div className="border border-primary bg-card p-8 space-y-4">
            <CheckCircle className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-xl font-black font-sans">
              {alreadyMember ? "Already a member!" : `Joined ${orgName || "the organization"}!`}
            </h2>
            <p className="text-sm font-mono text-muted-foreground">Redirecting to the dashboard...</p>
          </div>
        )}

        {error && (
          <div className="border border-destructive bg-destructive/10 p-8 space-y-4">
            <Building2 className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-xl font-black font-sans text-destructive">Invalid invite link</h2>
            <p className="text-sm font-mono text-muted-foreground">{error}</p>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-primary underline"
            >
              Go home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
