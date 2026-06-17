import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useTranscribeAudio, useGenerateContent, useCreateDraft } from "@workspace/api-client-react";
import type { ContentPlatform, GenerateResult } from "@workspace/api-client-react";
import { WORKFLOW_STEPS, scoreVoiceMatch } from "../lib/verniq-store";
import { motion } from "framer-motion";
import { Mic, Loader2, CheckCircle } from "lucide-react";

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

export default function Create() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useGetMyProfile();

  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [isRecording, setIsRecording] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  const transcribeAudio = useTranscribeAudio();
  const generateContent = useGenerateContent();
  const createDraft = useCreateDraft();

  // Wait for BOTH initial load AND any background refetch before checking voice_dna.
  // Without isFetching, stale cached profile (no voice_dna yet) causes an immediate
  // redirect back to /onboarding right after the user just saved their Voice DNA.
  if (profileLoading || profileFetching) return <div className="p-8 text-center text-muted-foreground font-mono">Loading...</div>;
  if (profile && !profile.voice_dna) {
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

  const handleGenerate = async () => {
    if (!idea.trim() || !profile?.voice_dna) return;
    setError(null);

    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      setWorkflowStep(i);
      await new Promise((r) => setTimeout(r, 380));
    }
    setWorkflowStep(WORKFLOW_STEPS.length);

    generateContent.mutate(
      { data: { idea, platform } },
      {
        onSuccess: (result: GenerateResult) => {
          const score = profile.voice_dna ? scoreVoiceMatch(profile.voice_dna) : 82;
          createDraft.mutate(
            { data: { idea, tiktok: result.output, twitter: result.parts ?? null, voice_match: score } },
            {
              onSuccess: (draft) => {
                sessionStorage.setItem(
                  `verniq.pending.${draft.id}`,
                  JSON.stringify({ idea, platform: result.platform, output: result.output, parts: result.parts, voiceMatch: score })
                );
                setLocation(`/results/${draft.id}`);
              },
              onError: () => {
                const id = crypto.randomUUID();
                sessionStorage.setItem(
                  `verniq.pending.${id}`,
                  JSON.stringify({ idea, platform: result.platform, output: result.output, parts: result.parts, voiceMatch: score })
                );
                setLocation(`/results/${id}`);
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

  // ── WORKFLOW ANIMATION ────────────────────────────────────────────────────
  if (workflowStep !== null) {
    const selectedPlatform = PLATFORMS.find((p) => p.id === platform);
    const isWriting = generateContent.isPending;
    return (
      <div className="min-h-screen flex flex-col px-4 py-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-primary-foreground">V</span>
          </div>
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
            Verniq AI Brain
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {selectedPlatform?.icon} {selectedPlatform?.label} · {selectedPlatform?.format}
          </span>
        </div>

        {/* Terminal panel */}
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

            {/* "Qwen AI is writing" — appears after all steps complete */}
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
                  <span className="text-primary font-bold">Qwen AI is writing in your voice...</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-xs text-muted-foreground pl-7 pb-1"
                >
                  Matching your tone · applying Voice DNA · crafting {selectedPlatform?.label} format
                </motion.div>
                {/* Progress bar */}
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

      {/* Voice DNA status + generate */}
      <div className="flex items-start justify-between gap-4">
        <div className="text-xs font-mono text-muted-foreground pt-1">
          {profile?.voice_dna ? (
            <span className="text-primary">✓ {profile.voice_dna.summary}</span>
          ) : (
            <span>No Voice DNA</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!idea.trim() || generateContent.isPending}
          className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-none text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20 flex-shrink-0"
        >
          Generate with AI →
        </button>
      </div>
    </div>
  );
}
