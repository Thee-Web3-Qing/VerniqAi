import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetOrg,
  useBuildOrgVoice,
  useRemoveOrgMember,
  useGetMyProfile,
} from "@workspace/api-client-react";
import type { OrgMemberDto, VoiceDNA } from "@workspace/api-client-react";
import { Building2, Users, Sparkles, Link2, Trash2, CheckCircle, ExternalLink } from "lucide-react";

function VoiceBadge({ dna }: { dna: VoiceDNA }) {
  return (
    <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">Brand Voice DNA</span>
      </div>
      <p className="text-sm italic text-foreground">"{dna.summary}"</p>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {[
          ["Tone", dna.tone],
          ["Energy", dna.energy],
          ["Hook style", dna.hookStyle],
          ["Formality", `${dna.formalityScore}/10`],
          ["Avg sentence", `~${Math.round(dna.avgSentenceLength)}w`],
          ["Content style", dna.contentStyle ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-muted-foreground uppercase tracking-widest text-[10px]">{label}</span>
            <span className="text-foreground font-bold truncate">{value}</span>
          </div>
        ))}
      </div>
      {dna.signaturePhrases?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {dna.signaturePhrases.slice(0, 5).map((p) => (
            <span key={p} className="px-2 py-0.5 border border-primary/30 text-primary text-xs font-mono">"{p}"</span>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isOwner,
  onRemove,
}: {
  member: OrgMemberDto;
  isOwner: boolean;
  onRemove: () => void;
}) {
  const initials = (member.display_name || "?").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 bg-primary/10 flex items-center justify-center text-primary text-xs font-black flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{member.display_name || "Team member"}</div>
        <div className="text-xs font-mono text-muted-foreground">{member.role}</div>
      </div>
      {isOwner && member.role !== "owner" && (
        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function OrgDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);

  const { data: org, isLoading, refetch } = useGetOrg(slug ?? "");
  const { data: myProfile } = useGetMyProfile();
  const buildVoice = useBuildOrgVoice();
  const removeMember = useRemoveOrgMember();

  if (isLoading || !slug) {
    return <div className="p-8 text-center text-muted-foreground font-mono">Loading...</div>;
  }

  if (!org) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground font-mono">Organization not found or you don't have access.</p>
        <button onClick={() => setLocation("/profile")} className="mt-4 text-sm text-primary underline">← Back to profile</button>
      </div>
    );
  }

  const isOwner = myProfile?.id === org.owner_id;
  const inviteUrl = `${window.location.origin}/org/join/${org.invite_code}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBuildVoice = () => {
    buildVoice.mutate(
      { slug },
      {
        onSuccess: () => {
          setBuildSuccess(true);
          refetch();
          setTimeout(() => setBuildSuccess(false), 3000);
        },
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate(
      { slug, memberId },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-4xl">
      <header className="mb-10 border-b border-border pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-black font-sans">{org.name}</h1>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{org.plan} plan · {org.members.length} member{org.members.length !== 1 ? "s" : ""}</p>
              {org.voice_dna_0g_hash && (
                <a
                  href={`https://scan-testnet.0g.ai`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 text-xs font-mono text-primary hover:underline"
                >
                  <CheckCircle className="w-3 h-3" />
                  Stored on 0G — verified on-chain
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setLocation("/create")}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-none hover:bg-primary/90 transition-colors hidden md:block"
          >
            Generate with brand voice →
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          {org.voice_dna ? (
            <VoiceBadge dna={org.voice_dna as VoiceDNA} />
          ) : (
            <div className="border border-dashed border-border p-6 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No Brand Voice built yet.</p>
              <p className="text-xs font-mono text-muted-foreground/60">
                Ask team members to complete their Voice DNA onboarding first, then build the brand voice.
              </p>
            </div>
          )}

          {isOwner && (
            <div className="space-y-3">
              <button
                onClick={handleBuildVoice}
                disabled={buildVoice.isPending}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {buildVoice.isPending
                  ? "Blending voices..."
                  : org.voice_dna
                  ? "Rebuild Brand Voice"
                  : "Build Brand Voice →"}
              </button>
              {buildSuccess && (
                <div className="flex items-center gap-2 text-green-500 text-sm font-mono">
                  <CheckCircle className="w-4 h-4" />
                  Brand voice built from {org.members.length} members!
                </div>
              )}
              {buildVoice.isError && (
                <p className="text-sm text-destructive font-mono">
                  {(buildVoice.error as { message?: string })?.message ?? "Build failed — make sure members have completed onboarding."}
                </p>
              )}
            </div>
          )}

          <div className="md:hidden">
            <button
              onClick={() => setLocation("/create")}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold rounded-none hover:bg-primary/90 transition-colors"
            >
              Generate with brand voice →
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {isOwner && (
            <div className="border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">Invite Link</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground break-all">{inviteUrl}</p>
              <button
                onClick={handleCopyInvite}
                className="w-full py-2.5 border border-border text-sm font-bold hover:border-primary transition-colors rounded-none"
              >
                {copied ? "✓ Copied!" : "Copy invite link"}
              </button>
            </div>
          )}

          <div className="border border-border bg-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">Members</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{org.members.length}</span>
            </div>
            <div className="px-5">
              {org.members.map((member: OrgMemberDto) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isOwner={isOwner}
                  onRemove={() => handleRemoveMember(member.user_id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
