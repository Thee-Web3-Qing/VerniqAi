import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useTranscribeAudio, useGenerateContent, useCreateDraft, useListCreators } from "@workspace/api-client-react";
import type { ContentPlatform, GenerateResult, PaymentInfo, Profile } from "@workspace/api-client-react";
import { WORKFLOW_STEPS, scoreVoiceMatch } from "../lib/verniq-store";
import { motion } from "framer-motion";
import { Mic, CheckCircle, CheckCircle2, X, Copy } from "lucide-react";

const PLATFORMS: {
  id: ContentPlatform;
  label: string;
  icon: string;
  format: string;
  description: string;
}[] = [
  { id: "tiktok", label: "TikTok", icon: "📱", format: "60–90s script", description: "Hook-first, punchy, raw" },
  { id: "twitter", label: "Twitter / X", icon: "𝕏", format: "5–7 tweet thread", description: "Hot take → thread" },
  { id: "instagram", label: "Instagram Reels", icon: "📸", format: "30–60s voiceover", description: "Aesthetic + authentic" },
  { id: "youtube-shorts", label: "YouTube Shorts", icon: "▶", format: "45–60s educational", description: "Value-first, subscribe CTA" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", format: "Story post", description: "Insight-driven narrative" },
  { id: "podcast", label: "Podcast", icon: "🎙", format: "Talking points", description: "Intro + points + outro" },
  { id: "newsletter", label: "Newsletter", icon: "✉", format: "Email copy", description: "Subject + body + PS" },
];

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function Create() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useGetMyProfile();
  const { data: creators, isLoading: creatorsLoading } = useListCreators();

  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [isRecording, setIsRecording] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [voiceMode, setVoiceMode] = useState<"my" | "creator">("my");
  const [showCreatorPicker, setShowCreatorPicker] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Profile | null>(null);
  const [paymentReminder, setPaymentReminder] = useState<{ payment: PaymentInfo; draftId: string } | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const pendingDraftRef = useRef<{ id: string; idea: string; platform: string; output: string; parts: string[] | null; voiceMatch: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  const transcribeAudio = useTranscribeAudio();
  const generateContent = useGenerateContent();
  const createDraft = useCreateDraft();

  // Check if a creator was pre-selected from CreatorProfile page
  useEffect(() => {
    const stored = sessionStorage.getItem("verniq.selectedCreator");
    if (stored) {
      try {
        const creator = JSON.parse(stored) as Profile;
        setSelectedCreator(creator);
        setVoiceMode("creator");
        sessionStorage.removeItem("verniq.selectedCreator");
      } catch { /* ignore */ }
    }
  }, []);

  if (profileLoading || profileFetching) return <div className="p-8 text-center text-muted-foreground font-mono">Loading...</div>;
  if (profile && !profile.voice_dna && voiceMode === "my") {
    setLocation("/onboarding");
    return null;
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const duration = (Date.now() - recordingStartRef.current) / 1000;
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          transcribeAudio.mutate(
            { data: { audioBase64: base64data, mime: "audio/webm", audioDurationSeconds: duration } },
            { onSuccess: (res) => { if (res.transcript) setIdea((p) => (p + " " + res.transcript).trim()); } }
          );
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const navigateToDraft = (draftId: string, data: { idea: string; platform: string; output: string; parts: string[] | null; voiceMatch: number }) => {
    sessionStorage.setItem(`verniq.pending.${draftId}`, JSON.stringify(data));
    setLocation(`/results/${draftId}`);
  };

  const handlePaymentAcknowledge = () => {
    if (pendingDraftRef.current) {
      const { id, ...rest } = pendingDraftRef.current;
      navigateToDraft(id, rest);
    }
    setPaymentReminder(null);
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    if (voiceMode === "my" && !profile?.voice_dna) return;
    if (voiceMode === "creator" && !selectedCreator) return;
    setError(null);

    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      setWorkflowStep(i);
      await new Promise((r) => setTimeout(r, 380));
    }
    setWorkflowStep(WORKFLOW_STEPS.length);

    const generatePayload = voiceMode === "creator" && selectedCreator
      ? { idea, platform, creatorId: selectedCreator.id }
      : { idea, platform };

    generateContent.mutate(
      { data: generatePayload },
      {
        onSuccess: (result: GenerateResult) => {
          const score = profile?.voice_dna ? scoreVoiceMatch(profile.voice_dna) : 82;
          createDraft.mutate(
            { data: { idea, tiktok: result.output, twitter: result.parts ?? null, voice_match: score } },
            {
              onSuccess: (draft) => {
                const draftData = {
                  id: draft.id,
                  idea,
                  platform: result.platform,
                  output: result.output,
                  parts: result.parts,
                  voiceMatch: score,
                };
                if (result.payment) {
                  pendingDraftRef.current = draftData;
                  setWorkflowStep(null);
                  setPaymentReminder({ payment: result.payment, draftId: draft.id });
                } else {
                  navigateToDraft(draft.id, draftData);
                }
              },
              onError: () => {
                const id = crypto.randomUUID();
                const draftData = { id, idea, platform: result.platform, output: result.output, parts: result.parts, voiceMatch: score };
                if (result.payment) {
                  pendingDraftRef.current = draftData;
                  setWorkflowStep(null);
                  setPaymentReminder({ payment: result.payment, draftId: id });
                } else {
                  navigateToDraft(id, draftData);
                }
              },
            }
          );
        },
        onError: () => {
          setWorkflowStep(null);
          setError("Generation failed. Please try again.");
        },
      }
    );
  };

  // ── PAYMENT REMINDER MODAL ────────────────────────────────────────────────
  if (paymentReminder) {
    const { payment } = paymentReminder;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="bg-card border border-primary max-w-md w-full">
          <div className="px-8 py-6 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-black font-sans">Content Generated!</h2>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              You used {payment.creatorName}'s Voice DNA.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="border border-border bg-background p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Amount owed</span>
                <span className="text-2xl font-black font-sans text-primary">${payment.priceUsd.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Payment wallet</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{truncateAddress(payment.walletAddress)}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(payment.walletAddress);
                      setCopiedWallet(true);
                      setTimeout(() => setCopiedWallet(false), 2000);
                    }}
                    className="p-1.5 border border-border hover:border-primary transition-colors"
                  >
                    {copiedWallet ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {copiedWallet && <p className="text-xs font-mono text-green-500">Copied!</p>}
              </div>
            </div>

            <p className="text-xs font-mono text-muted-foreground text-center">
              Send ${payment.priceUsd.toFixed(2)} USD equivalent to the address above. Payments are on an honor system — always support the creators you use.
            </p>

            <button
              onClick={handlePaymentAcknowledge}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-none text-sm hover:bg-primary/90 transition-colors"
            >
              I'll send the payment → View my content
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── WORKFLOW ANIMATION ────────────────────────────────────────────────────
  if (workflowStep !== null) {
    const selectedPlatform = PLATFORMS.find((p) => p.id === platform);
    const isWriting = generateContent.isPending;
    return (
      <div className="min-h-screen flex flex-col px-4 py-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-primary-foreground">V</span>
          </div>
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
            Verniq AI Brain
          </span>
          {voiceMode === "creator" && selectedCreator && (
            <span className="text-xs font-mono text-muted-foreground">
              Using {selectedCreator.display_name}'s voice
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {selectedPlatform?.icon} {selectedPlatform?.label} · {selectedPlatform?.format}
          </span>
        </div>

        <div className="border border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/60">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-xs font-mono text-muted-foreground ml-2">content-generation</span>
          </div>

          <div className="p-5 space-y-1 font-mono text-sm">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isDone = workflowStep > idx;
              const isActive = workflowStep === idx;
              if (!isDone && !isActive) return null;
              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 py-1"
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"
                    />
                  )}
                  <span className={isDone ? "text-muted-foreground" : "text-foreground"}>{step}</span>
                  {isDone && <span className="text-green-500 text-xs ml-auto">done</span>}
                </motion.div>
              );
            })}

            {isWriting && (
              <>
                <div className="border-t border-border/50 my-3" />
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 py-1"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"
                  />
                  <span className="text-primary font-bold">
                    {voiceMode === "creator" && selectedCreator
                      ? `Writing in ${selectedCreator.display_name}'s voice...`
                      : "Qwen AI is writing in your voice..."}
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-xs text-muted-foreground pl-7 pb-1"
                >
                  Matching tone · applying Voice DNA · crafting {selectedPlatform?.label} format
                </motion.div>
                <div className="pl-7 pt-1 pb-2">
                  <div className="h-0.5 bg-border overflow-hidden w-full">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "90%" }}
                      transition={{ duration: 40, ease: "linear" }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN UI ───────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
      <header className="mb-10 border-b border-border pb-8">
        <h1 className="text-4xl font-black font-sans mb-2">Create Content</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Pick a platform · Drop your idea · Qwen AI repurposes it in your voice.
        </p>
      </header>

      {/* Voice Source selector */}
      <div className="mb-8">
        <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Voice Source
        </label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setVoiceMode("my"); setSelectedCreator(null); setShowCreatorPicker(false); }}
            className={`px-4 py-2.5 border text-sm font-bold rounded-none transition-all ${
              voiceMode === "my" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
            }`}
          >
            My Voice DNA
          </button>
          <button
            onClick={() => { setVoiceMode("creator"); setShowCreatorPicker(true); }}
            className={`px-4 py-2.5 border text-sm font-bold rounded-none transition-all ${
              voiceMode === "creator" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
            }`}
          >
            {selectedCreator ? `${selectedCreator.display_name || "Creator"}'s Voice` : "Borrow a Creator Voice"}
          </button>
        </div>

        {/* Creator picker dropdown */}
        {voiceMode === "creator" && showCreatorPicker && (
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Select a Creator</span>
              <button onClick={() => setShowCreatorPicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {creatorsLoading ? (
                <div className="text-xs font-mono text-muted-foreground p-3">Loading creators...</div>
              ) : creators && creators.length > 0 ? (
                creators.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCreator(c as unknown as Profile); setShowCreatorPicker(false); }}
                    className={`w-full flex items-center gap-3 p-3 border text-left rounded-none transition-all ${
                      selectedCreator?.id === c.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-secondary border border-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-sm font-black text-primary">
                          {(c.display_name || "?").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{c.display_name || "Anonymous Creator"}</div>
                      <div className="text-xs font-mono text-muted-foreground">{c.niche || "Creator"}</div>
                    </div>
                    {c.price_per_generation > 0 ? (
                      <span className="text-xs font-mono font-bold text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 flex-shrink-0">
                        ${(c.price_per_generation / 100).toFixed(2)}/gen
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5 flex-shrink-0">
                        Free
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-xs font-mono text-muted-foreground p-3">No public creators available yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Selected creator chip */}
        {voiceMode === "creator" && selectedCreator && !showCreatorPicker && (
          <div className="flex items-center gap-3 px-4 py-3 border border-primary/30 bg-primary/5">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 text-sm font-mono">
              <span className="text-primary font-bold">{selectedCreator.display_name}'s voice</span>
              {(selectedCreator.price_per_generation ?? 0) > 0 && (
                <span className="text-muted-foreground ml-2">
                  · ${((selectedCreator.price_per_generation ?? 0) / 100).toFixed(2)} will be owed after generation
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCreatorPicker(true)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Change
            </button>
            <button
              onClick={() => { setSelectedCreator(null); setVoiceMode("my"); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {voiceMode === "creator" && !selectedCreator && !showCreatorPicker && (
          <button
            onClick={() => setShowCreatorPicker(true)}
            className="text-xs font-mono text-primary hover:underline"
          >
            Select a creator →
          </button>
        )}
      </div>

      {/* Platform selector */}
      <div className="mb-8">
        <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Platform
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`p-3 border text-left transition-all rounded-none ${
                platform === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="text-xs font-bold leading-tight">{p.label}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.format}</div>
            </button>
          ))}
        </div>
        {platform && (
          <p className="mt-2 text-xs font-mono text-primary">
            {PLATFORMS.find((p) => p.id === platform)?.description}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive text-sm font-mono">{error}</div>
      )}

      {/* Idea input */}
      <div className="mb-6">
        <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Your idea
        </label>
        <div className="bg-card border border-border p-6 relative focus-within:border-primary transition-colors">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Type your idea, paste a script, or drop a URL..."
            className="w-full h-44 bg-transparent outline-none resize-none font-sans text-lg placeholder:text-muted-foreground"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            {transcribeAudio.isPending && (
              <span className="text-xs text-primary font-mono animate-pulse">Transcribing...</span>
            )}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-none transition-all ${
                isRecording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
              title={isRecording ? "Stop recording" : "Speak your idea"}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Voice status + generate button */}
      <div className="flex items-start justify-between gap-4">
        <div className="text-xs font-mono text-muted-foreground pt-1">
          {voiceMode === "creator" && selectedCreator ? (
            <span className="text-primary">
              ✓ Using {selectedCreator.display_name}'s Voice DNA
            </span>
          ) : profile?.voice_dna ? (
            <span className="text-primary">✓ {profile.voice_dna.summary}</span>
          ) : (
            <span>No Voice DNA</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={
            !idea.trim() ||
            generateContent.isPending ||
            (voiceMode === "my" && !profile?.voice_dna) ||
            (voiceMode === "creator" && !selectedCreator)
          }
          className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-none text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20 flex-shrink-0"
        >
          Generate with AI →
        </button>
      </div>
    </div>
  );
}
