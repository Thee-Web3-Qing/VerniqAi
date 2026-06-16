import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGetMyProfile, useTranscribeAudio } from "@workspace/api-client-react";
import { analyzeSamples, WORKFLOW_STEPS, generateTikTok, generateTwitter, scoreVoiceMatch } from "../lib/verniq-store";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2 } from "lucide-react";

export default function Create() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  
  const [idea, setIdea] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const transcribeAudio = useTranscribeAudio();

  // Redirect if no Voice DNA
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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          transcribeAudio.mutate({
            data: { audioBase64: base64data, mime: 'audio/webm' }
          }, {
            onSuccess: (res) => {
              setIdea(prev => (prev + " " + res.transcript).trim());
            }
          });
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleGenerate = async () => {
    if (!idea.trim() || !profile?.voice_dna) return;

    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      setWorkflowStep(i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setWorkflowStep(WORKFLOW_STEPS.length);

    const tiktok = generateTikTok(idea, profile.voice_dna);
    const twitter = generateTwitter(idea, profile.voice_dna);
    const score = scoreVoiceMatch(profile.voice_dna);

    const id = crypto.randomUUID();
    sessionStorage.setItem(`verniq.pending.${id}`, JSON.stringify({
      idea,
      tiktok,
      twitter,
      voiceMatch: score
    }));

    setLocation(`/results/${id}`);
  };

  if (workflowStep !== null) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-sans font-black mb-8 text-center text-primary">Running Verniq Protocol</h2>
          <div className="space-y-4">
            {WORKFLOW_STEPS.map((step, idx) => (
              <motion.div 
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: workflowStep >= idx ? 1 : 0.2,
                  y: 0,
                  scale: workflowStep === idx ? 1.02 : 1
                }}
                className={`p-4 border rounded font-mono text-sm flex items-center gap-3 transition-colors ${
                  workflowStep === idx ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {workflowStep === idx && <Loader2 className="w-4 h-4 animate-spin" />}
                {workflowStep > idx && <span className="text-primary w-4 h-4 text-center">✓</span>}
                {step}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <header className="mb-12 border-b border-border pb-8">
        <h1 className="text-4xl font-black font-sans mb-2">Create Content</h1>
        <p className="text-muted-foreground font-mono text-sm">Input your idea. Verniq will repurpose it using your Voice DNA.</p>
      </header>

      <div className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-lg relative focus-within:border-primary transition-colors">
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
              className={`p-3 rounded-full transition-all ${isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
              title={isRecording ? "Stop recording" : "Record audio"}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!idea.trim()}
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Generate Workflow →
          </button>
        </div>
      </div>
    </div>
  );
}