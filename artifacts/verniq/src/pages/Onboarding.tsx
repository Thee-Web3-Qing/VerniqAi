import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useUpdateMyProfile, useTranscribeAudio, useAnalyseVoice } from "@workspace/api-client-react";
import type { AnalysisStep, VoiceDNA } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, CheckCircle, Brain, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

type Stage = "input" | "analysing" | "review" | "saving";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"writer" | "video">("writer");
  const [samples, setSamples] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [transcriptReady, setTranscriptReady] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const [stage, setStage] = useState<Stage>("input");
  const [visibleSteps, setVisibleSteps] = useState<AnalysisStep[]>([]);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [voiceDna, setVoiceDna] = useState<VoiceDNA | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const updateProfile = useUpdateMyProfile();
  const transcribeAudio = useTranscribeAudio();
  const analyseVoiceMutation = useAnalyseVoice();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

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
    setAnalysisError(null);

    analyseVoiceMutation.mutate(
      {
        data: {
          text: textToAnalyse,
          audioDurationSeconds: mode === "video" ? audioDuration : undefined,
        },
      },
      {
        onSuccess: async (result) => {
          setAnalysisSteps(result.steps);
          setVoiceDna(result.voiceDna as VoiceDNA);
          setStage("review");
          for (let i = 0; i < result.steps.length; i++) {
            await new Promise((r) => setTimeout(r, 550));
            setVisibleSteps((prev) => [...prev, result.steps[i] as AnalysisStep]);
          }
        },
        onError: (err) => {
          console.error("Analysis error:", err);
          setAnalysisError("Analysis failed. Please try again.");
          setStage("input");
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

  // ── ANALYSING STAGE ──────────────────────────────────────────────────────
  if (stage === "analysing") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary border-t-transparent mx-auto mb-6"
          />
          <h2 className="text-2xl font-black font-sans mb-2 text-primary">Verniq is reading your voice...</h2>
          <p className="text-sm font-mono text-muted-foreground">Connecting to Qwen AI · Scanning patterns · Mapping signature</p>
        </div>
      </div>
    );
  }

  // ── REVIEW STAGE ─────────────────────────────────────────────────────────
  if (stage === "review" || stage === "saving") {
    return (
      <div className="container mx-auto px-4 md:px-8 py-10 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black font-sans text-primary">Verniq · Voice Analysis</h1>
        </div>

        <p className="text-sm font-mono text-muted-foreground mb-8">
          Qwen AI has mapped {analysisSteps.length} dimensions of your voice. Review before locking it in.
        </p>

        {/* Analysis steps */}
        <div className="space-y-3 mb-10">
          <AnimatePresence>
            {visibleSteps.map((step, i) => (
              <motion.div
                key={step.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="border border-border bg-card p-4 flex gap-4"
              >
                <span className="text-2xl flex-shrink-0 w-8 text-center">{step.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{step.category}</span>
                    <span className="text-sm font-bold text-primary text-right flex-shrink-0">{step.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.reasoning}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading placeholders */}
          {Array.from({ length: Math.max(0, (analysisSteps.length || 8) - visibleSteps.length) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="border border-border/30 bg-card/30 p-4 h-16 animate-pulse" />
          ))}
        </div>

        {/* Voice DNA summary card — shown only after all steps revealed */}
        <AnimatePresence>
          {visibleSteps.length === analysisSteps.length && voiceDna && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="border-2 border-primary bg-primary/5 p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black font-sans text-primary">Voice DNA Signature</h2>
                </div>
                <p className="text-base font-sans italic mb-5 text-foreground">"{voiceDna.summary}"</p>
                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <Trait label="Tone" value={voiceDna.tone} />
                  <Trait label="Energy" value={voiceDna.energy} />
                  <Trait label="Hook style" value={voiceDna.hookStyle} />
                  <Trait label="Closing" value={voiceDna.closingStyle} />
                  {voiceDna.emotions && <Trait label="Emotions" value={voiceDna.emotions} />}
                  {voiceDna.charisma && <Trait label="Charisma" value={voiceDna.charisma} />}
                  {voiceDna.contentStyle && <Trait label="Style" value={voiceDna.contentStyle} />}
                  {voiceDna.pacing && <Trait label="Pacing" value={voiceDna.pacing} />}
                  <Trait label="Formality" value={`${voiceDna.formalityScore}/10`} />
                  <Trait label="Avg sentence" value={`~${Math.round(voiceDna.avgSentenceLength)} words`} />
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <button
                  onClick={() => { setStage("input"); setVisibleSteps([]); }}
                  className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Re-analyse
                </button>
                <button
                  onClick={handleCreateDNA}
                  disabled={stage === "saving" || updateProfile.isPending}
                  className="flex-1 py-4 bg-primary text-primary-foreground font-black text-lg rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
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

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 p-3">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-bold text-foreground capitalize">{value}</div>
    </div>
  );
}
