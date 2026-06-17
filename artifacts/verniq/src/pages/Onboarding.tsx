import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useUpdateMyProfile, useTranscribeAudio, useAnalyseVoice } from "@workspace/api-client-react";
import type { AnalysisStep, VoiceDNA } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, CheckCircle, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

type Stage = "input" | "analysing" | "review" | "saving";

const PRE_STEPS = [
  { id: "connect", emoji: "⚡", label: "Connecting to Qwen AI" },
  { id: "read",    emoji: "📖", label: "Reading content patterns" },
  { id: "scan",    emoji: "🔍", label: "Scanning voice signature" },
  { id: "map",     emoji: "🧠", label: "Mapping 8 dimensions" },
];

// Index of the last pre-step that shows the long progress bar
const MAP_STEP_IDX = PRE_STEPS.length - 1;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"writer" | "video">("writer");
  const [samples, setSamples] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [transcriptReady, setTranscriptReady] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const [stage, setStage] = useState<Stage>("input");
  const [activePreStep, setActivePreStep] = useState(0);
  const [donePreSteps, setDonePreSteps] = useState<Set<string>>(new Set());
  const [visibleSteps, setVisibleSteps] = useState<AnalysisStep[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [voiceDna, setVoiceDna] = useState<VoiceDNA | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showDna, setShowDna] = useState(false);
  // Progress bar for "Mapping 8 dimensions" — fake linear fill while API is in flight
  const [mapBarPct, setMapBarPct] = useState(0);
  const mapBarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateProfile = useUpdateMyProfile();
  const transcribeAudio = useTranscribeAudio();
  const analyseVoiceMutation = useAnalyseVoice();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  // Animate pre-steps while in "analysing" stage
  useEffect(() => {
    if (stage !== "analysing") return;
    let idx = 0;
    setActivePreStep(0);
    setMapBarPct(0);
    const interval = setInterval(() => {
      idx += 1;
      if (idx < PRE_STEPS.length) {
        setDonePreSteps((prev) => new Set([...prev, PRE_STEPS[idx - 1].id]));
        setActivePreStep(idx);
        // Start the map bar when last pre-step becomes active
        if (idx === MAP_STEP_IDX) {
          if (mapBarIntervalRef.current) clearInterval(mapBarIntervalRef.current);
          mapBarIntervalRef.current = setInterval(() => {
            setMapBarPct((p) => {
              if (p >= 90) {
                clearInterval(mapBarIntervalRef.current!);
                return 90;
              }
              return p + 0.25;
            });
          }, 100);
        }
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [stage]);

  // Complete the map bar when API returns
  useEffect(() => {
    if (stage === "review" || stage === "saving") {
      if (mapBarIntervalRef.current) clearInterval(mapBarIntervalRef.current);
      setMapBarPct(100);
    }
  }, [stage]);

  const startRecording = async () => {
    try {
      setAudioTranscript("");
      setTranscriptReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = (Date.now() - recordingStartRef.current) / 1000;
        setAudioDuration(duration);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          transcribeAudio.mutate(
            { data: { audioBase64: base64data, mime: "audio/webm", audioDurationSeconds: duration } },
            {
              onSuccess: (res) => {
                setAudioTranscript(res.transcript ?? "");
                setTranscriptReady(true);
              },
            }
          );
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Could not access microphone. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const textToAnalyse = mode === "writer" ? samples : audioTranscript;

  const handleAnalyse = () => {
    if (!textToAnalyse.trim()) return;
    setStage("analysing");
    setVisibleSteps([]);
    setAnalysisSteps([]);
    setVoiceDna(null);
    setShowDna(false);
    setDonePreSteps(new Set());
    setActivePreStep(0);
    setActiveStepIdx(null);
    setAnalysisError(null);

    analyseVoiceMutation.mutate(
      { data: { text: textToAnalyse, audioDurationSeconds: mode === "video" ? audioDuration : undefined } },
      {
        onSuccess: async (result) => {
          // Complete all pre-steps instantly
          setDonePreSteps(new Set(PRE_STEPS.map((s) => s.id)));
          setActivePreStep(-1);
          setAnalysisSteps(result.steps as AnalysisStep[]);
          setVoiceDna(result.voiceDna as VoiceDNA);
          setStage("review");

          // Reveal each step one by one
          for (let i = 0; i < result.steps.length; i++) {
            setActiveStepIdx(i);
            await new Promise((r) => setTimeout(r, 120));
            setVisibleSteps((prev) => [...prev, result.steps[i] as AnalysisStep]);
            await new Promise((r) => setTimeout(r, 380));
          }
          setActiveStepIdx(null);

          // Show DNA card
          await new Promise((r) => setTimeout(r, 300));
          setShowDna(true);
        },
        onError: (err) => {
          console.error("Analysis error:", err);
          setAnalysisError("Analysis failed. Please try again.");
          setStage("input");
          setDonePreSteps(new Set());
        },
      }
    );
  };

  const handleCreateDNA = () => {
    if (!voiceDna) return;
    setStage("saving");
    const dnaWithMeta = {
      ...voiceDna,
      sampleCount: mode === "writer"
        ? samples.split("---").filter((s) => s.trim()).length
        : 1,
      source: mode,
      lastUpdated: new Date().toISOString(),
    };
    updateProfile.mutate(
      { data: { voice_dna: dnaWithMeta } },
      { onSuccess: () => setLocation("/create") }
    );
  };

  // ── ANALYSING / REVIEW STAGE — live log panel ─────────────────────────────
  if (stage === "analysing" || stage === "review" || stage === "saving") {
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
            {visibleSteps.length}/{analysisSteps.length || 8} dimensions
          </span>
        </div>

        {/* Terminal panel */}
        <div className="border border-border bg-card flex-1 overflow-hidden">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/60">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-xs font-mono text-muted-foreground ml-2">voice-dna-analysis</span>
          </div>

          <div className="p-5 space-y-1 font-mono text-sm">
            {/* Pre-steps */}
            {PRE_STEPS.map((step, i) => {
              const isDone = donePreSteps.has(step.id);
              const isActive = activePreStep === i && stage === "analysing";
              const isVisible = isDone || isActive || i < activePreStep;
              const isMapStep = i === MAP_STEP_IDX;

              if (!isVisible) return null;

              return (
                <motion.div key={step.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <div className="flex items-center gap-3 py-1">
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <SpinnerIcon />
                    )}
                    <span className={isDone ? "text-muted-foreground" : "text-foreground"}>
                      {step.emoji} {step.label}
                    </span>
                    {isDone && <span className="text-green-500 text-xs ml-auto">done</span>}
                  </div>
                  {/* Progress bar — only on the "Mapping 8 dimensions" step while active or completing */}
                  {isMapStep && (isActive || (isDone && mapBarPct > 0)) && (
                    <div className="pl-7 pb-2">
                      <div className="h-0.5 bg-border overflow-hidden w-full mt-1">
                        <motion.div
                          className="h-full bg-primary"
                          style={{ width: `${mapBarPct}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground/60">
                          {isDone ? "Analysis complete" : "Qwen AI analysing..."}
                        </span>
                        <span className="text-xs text-primary font-mono">{Math.round(mapBarPct)}%</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Separator after pre-steps complete */}
            {(stage === "review" || stage === "saving") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-border/50 my-3"
              />
            )}

            {/* Actual dimension steps */}
            <AnimatePresence>
              {visibleSteps.map((step, i) => (
                <motion.div
                  key={step.category}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="py-1.5"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-muted-foreground text-xs uppercase tracking-widest">
                          {step.emoji} {step.category}
                        </span>
                        <span className="text-primary font-bold text-xs text-right">
                          {step.value}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                        {step.reasoning}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Currently analysing step */}
            {activeStepIdx !== null && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 py-1.5"
              >
                <SpinnerIcon />
                <span className="text-foreground text-xs">
                  {analysisSteps[activeStepIdx]?.emoji}{" "}
                  Analysing {analysisSteps[activeStepIdx]?.category}...
                </span>
              </motion.div>
            )}

            {/* Blinking cursor while loading */}
            {stage === "analysing" && activeStepIdx === null && (
              <div className="flex items-center gap-3 py-1">
                <SpinnerIcon />
                <span className="text-muted-foreground text-xs">Processing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Completion banner + DNA card */}
        <AnimatePresence>
          {showDna && voiceDna && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 space-y-4"
            >
              {/* Pipeline complete banner */}
              <div className="border border-primary bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
                    Analysis complete · {visibleSteps.length} dimensions mapped
                  </span>
                </div>
              </div>

              {/* DNA summary */}
              <div className="border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
                    Voice DNA Signature
                  </span>
                </div>
                <p className="text-sm font-sans italic mb-4 text-foreground leading-relaxed">
                  "{voiceDna.summary}"
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <Trait label="Tone" value={voiceDna.tone} />
                  <Trait label="Energy" value={voiceDna.energy} />
                  <Trait label="Hook style" value={voiceDna.hookStyle} />
                  <Trait label="Closing" value={voiceDna.closingStyle} />
                  {voiceDna.emotions && <Trait label="Emotions" value={voiceDna.emotions} />}
                  {voiceDna.charisma && <Trait label="Charisma" value={voiceDna.charisma} />}
                  {voiceDna.contentStyle && <Trait label="Style" value={voiceDna.contentStyle} />}
                  {voiceDna.pacing && <Trait label="Pacing" value={voiceDna.pacing} />}
                  <Trait label="Formality" value={`${voiceDna.formalityScore}/10`} />
                  <Trait label="Avg sentence" value={`~${Math.round(voiceDna.avgSentenceLength)}w`} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => { setStage("input"); setVisibleSteps([]); setShowDna(false); }}
                  className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Re-analyse
                </button>
                <button
                  onClick={handleCreateDNA}
                  disabled={stage === "saving" || updateProfile.isPending}
                  className="flex-1 py-4 bg-primary text-primary-foreground font-black text-base rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {stage === "saving" || updateProfile.isPending
                    ? "Creating Voice DNA..."
                    : "Create Voice DNA →"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── INPUT STAGE ───────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-12">
        <Logo />
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${
              n === 2 ? "bg-primary text-primary-foreground" : n < 2 ? "bg-primary/20 text-primary" : "border border-border text-muted-foreground"
            }`}>{n < 2 ? "✓" : `0${n}`}</div>
          ))}
        </div>
      </div>

      <header className="mb-10">
        <h1 className="text-4xl font-black font-sans mb-3">Build your Voice DNA</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Give Verniq your content. Qwen AI will map your exact voice signature across 8 dimensions.
        </p>
      </header>

      {analysisError && (
        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive text-sm font-mono">
          {analysisError}
        </div>
      )}

      <div className="border border-border overflow-hidden mb-8">
        {/* Mode tabs */}
        <div className="flex">
          {(["writer", "video"] as const).map((m) => (
            <button
              key={m}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => { setMode(m); setTranscriptReady(false); setAudioTranscript(""); }}
            >
              {m === "writer" ? "Writer" : "Video creator"}
            </button>
          ))}
        </div>

        <div className="p-8">
          {mode === "writer" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Paste 3+ writing samples</label>
                <p className="text-xs text-muted-foreground mb-4 font-mono">Separate each sample with "---" · The more you give, the more accurate your Voice DNA</p>
                <textarea
                  value={samples}
                  onChange={(e) => setSamples(e.target.value)}
                  className="w-full h-64 bg-input border border-border p-4 font-sans text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder={"Your first post or caption...\n---\nA second piece of content...\n---\nA third sample (could be a tweet thread, script, etc.)"}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyse}
                  disabled={!samples.trim()}
                  className="py-3 px-8 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Analyse my voice →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">
                Record yourself talking naturally — share a thought, tell a story, react to something. Sarvam will transcribe it, Qwen will map your voice signature.
              </p>

              {!transcriptReady && (
                <div className="flex flex-col items-center gap-6 py-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={transcribeAudio.isPending}
                    className={`w-32 h-32 flex items-center justify-center border-4 transition-all disabled:opacity-50 ${
                      isRecording
                        ? "border-destructive text-destructive bg-destructive/10 animate-pulse"
                        : "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                  </button>
                  <p className="text-sm text-muted-foreground font-mono h-6 text-center">
                    {isRecording ? "Recording... tap to stop" : transcribeAudio.isPending ? "Transcribing with Sarvam..." : "Tap to start recording"}
                  </p>
                  {transcribeAudio.isPending && (
                    <div className="w-full max-w-xs h-1 bg-border overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-2/3" />
                    </div>
                  )}
                </div>
              )}

              {transcriptReady && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-bold font-mono">Transcription complete</span>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Transcript — review or edit before analysis
                    </label>
                    <textarea
                      value={audioTranscript}
                      onChange={(e) => setAudioTranscript(e.target.value)}
                      className="w-full h-48 bg-input border border-border p-4 font-sans text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => { setTranscriptReady(false); setAudioTranscript(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={handleAnalyse}
                      disabled={!audioTranscript.trim()}
                      className="py-3 px-8 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      Analyse my voice →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"
    />
  );
}

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 p-2.5">
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div className="font-bold text-foreground capitalize text-xs">{value}</div>
    </div>
  );
}
