import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useTranscribeAudio, useGenerateContent, useCreateDraft } from "@workspace/api-client-react";
import { WORKFLOW_STEPS, scoreVoiceMatch } from "../lib/verniq-store";
import { motion } from "framer-motion";
import { Mic, Loader2 } from "lucide-react";

export default function Create() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();

  const [idea, setIdea] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeAudio = useTranscribeAudio();
  const generateContent = useGenerateContent();
  const createDraft = useCreateDraft();

  if (profileLoading) return <div className="p-8 text-center text-muted-foreground font-mono">Loading profile...</div>;
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          transcribeAudio.mutate(
            { data: { audioBase64: base64data, mime: "audio/webm" } },
            {
              onSuccess: (res) => {
                if (res.transcript) setIdea((prev) => (prev + " " + res.transcript).trim());
              },
            }
          );
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
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

    // Animate through workflow steps
    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      setWorkflowStep(i);
      await new Promise((r) => setTimeout(r, 400));
    }
    setWorkflowStep(WORKFLOW_STEPS.length);

    generateContent.mutate(
      { data: { idea } },
      {
        onSuccess: async (result: { tiktok: string; twitter: string[] }) => {
          const score = profile.voice_dna ? scoreVoiceMatch(profile.voice_dna) : 80;

          // Save draft to DB
          createDraft.mutate(
            {
              data: {
                idea,
                tiktok: result.tiktok,
                twitter: result.twitter,
                voice_match: score,
              },
            },
            {
              onSuccess: (draft) => {
                setLocation(`/results/${draft.id}`);
              },
              onError: () => {
                // Even if draft save fails, go to results via sessionStorage
                const id = crypto.randomUUID();
                sessionStorage.setItem(
                  `verniq.pending.${id}`,
                  JSON.stringify({ idea, tiktok: result.tiktok, twitter: result.twitter, voiceMatch: score })
                );
                setLocation(`/results/${id}`);
              },
            }
          );
        },
        onError: (err: unknown) => {
          setWorkflowStep(null);
          setError("Generation failed. Please try again.");
          console.error("Generate error:", err);
        },
      }
    );
  };

  if (workflowStep !== null) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-sans font-black mb-2 text-center text-primary">Running Verniq Protocol</h2>
          <p className="text-center text-xs font-mono text-muted-foreground mb-8">Qwen AI is generating content in your voice...</p>
          <div className="space-y-3">
            {WORKFLOW_STEPS.map((step, idx) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: workflowStep >= idx ? 1 : 0.2,
                  y: 0,
                  scale: workflowStep === idx ? 1.02 : 1,
                }}
                className={`p-4 border font-mono text-sm flex items-center gap-3 transition-colors ${
                  workflowStep === idx
                    ? "border-primary bg-primary/10 text-primary"
                    : workflowStep > idx
                    ? "border-border bg-card text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {workflowStep === idx && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                {workflowStep > idx && <span className="text-primary w-4 h-4 text-center flex-shrink-0">✓</span>}
                {workflowStep <= idx && workflowStep !== idx && <span className="w-4 h-4 flex-shrink-0" />}
                {step}
              </motion.div>
            ))}
          </div>
          {generateContent.isPending && (
            <p className="text-center text-xs font-mono text-primary mt-6 animate-pulse">Waiting for Qwen AI...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
      <header className="mb-12 border-b border-border pb-8">
        <h1 className="text-4xl font-black font-sans mb-2">Create Content</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Input your idea. Qwen AI will repurpose it in your Voice DNA.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive text-sm font-mono">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-card border border-border p-6 relative focus-within:border-primary transition-colors">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Type your idea, paste a script, or drop a URL..."
            className="w-full h-48 bg-transparent outline-none resize-none font-sans text-lg placeholder:text-muted-foreground"
          />
          <div className="absolute bottom-6 right-6 flex items-center gap-4">
            {transcribeAudio.isPending && (
              <span className="text-xs text-primary font-mono animate-pulse">Transcribing...</span>
            )}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-none transition-all ${
                isRecording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
              title={isRecording ? "Stop recording" : "Record audio"}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground">
            {profile?.voice_dna ? (
              <span className="text-primary">✓ Voice DNA loaded — {profile.voice_dna.summary}</span>
            ) : (
              <span>No Voice DNA yet</span>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={!idea.trim() || generateContent.isPending}
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-none text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Generate with AI →
          </button>
        </div>
      </div>
    </div>
  );
}
