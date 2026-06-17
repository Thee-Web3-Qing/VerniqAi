import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useUpdateMyProfile, useTranscribeAudio } from "@workspace/api-client-react";
import { analyzeSamples } from "../lib/verniq-store";
import { Mic, MicOff, CheckCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"writer" | "video">("writer");
  const [samples, setSamples] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [transcriptReady, setTranscriptReady] = useState(false);

  const updateProfile = useUpdateMyProfile();
  const transcribeAudio = useTranscribeAudio();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSave = (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    const parts = mode === "writer"
      ? textToAnalyze.split("---").map(s => s.trim()).filter(Boolean)
      : [textToAnalyze];
    if (parts.length === 0) return;

    const dna = analyzeSamples(parts, mode);
    updateProfile.mutate({ data: { voice_dna: dna } }, {
      onSuccess: () => setLocation("/create"),
    });
  };

  const startRecording = async () => {
    try {
      setAudioTranscript("");
      setTranscriptReady(false);
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
                setAudioTranscript(res.transcript);
                setTranscriptReady(true);
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

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-12">
        <Logo />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">✓</div>
          <div className="h-0.5 w-8 bg-primary" />
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">02</div>
          <div className="h-0.5 w-8 bg-border" />
          <div className="w-8 h-8 border border-border text-muted-foreground flex items-center justify-center font-bold text-sm">03</div>
          <div className="h-0.5 w-8 bg-border" />
          <div className="w-8 h-8 border border-border text-muted-foreground flex items-center justify-center font-bold text-sm">04</div>
        </div>
      </div>

      <header className="mb-10">
        <h1 className="text-4xl font-black font-sans mb-3">Build your Voice DNA</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          The more you give us, the more it sounds like you.
        </p>
      </header>

      {/* Mode tabs */}
      <div className="border border-border overflow-hidden mb-8">
        <div className="flex">
          <button
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === "writer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => { setMode("writer"); setTranscriptReady(false); setAudioTranscript(""); }}
          >
            Writer
          </button>
          <button
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => { setMode("video"); setTranscriptReady(false); setAudioTranscript(""); }}
          >
            Video creator
          </button>
        </div>

        <div className="p-8">
          {mode === "writer" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-1">Paste 3+ writing samples</label>
                <p className="text-xs text-muted-foreground mb-4 font-mono">Separate each sample with "---"</p>
                <textarea
                  value={samples}
                  onChange={(e) => setSamples(e.target.value)}
                  className="w-full h-64 bg-input border border-border p-4 font-sans text-sm focus:outline-none focus:border-primary transition-colors text-foreground resize-none"
                  placeholder={"Sample 1 content goes here...\n---\nSample 2 content goes here..."}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleSave(samples)}
                  disabled={!samples.trim() || updateProfile.isPending}
                  className="py-3 px-8 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {updateProfile.isPending ? "Analyzing..." : "Analyze my voice →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">
                Drop a video URL, then hit Record. We capture the audio while it plays and
                transcribe it (Sarvam) to learn your pacing and style.
              </p>

              {/* Record button */}
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
                    {isRecording
                      ? "Recording... tap to stop"
                      : transcribeAudio.isPending
                      ? "Transcribing with Sarvam..."
                      : "Tap to start recording"}
                  </p>

                  {transcribeAudio.isPending && (
                    <div className="w-full max-w-xs h-1 bg-border overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-2/3" />
                    </div>
                  )}
                </div>
              )}

              {/* Transcript ready — show for review */}
              {transcriptReady && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-bold font-mono">Transcription complete</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Transcript — review or edit
                    </label>
                    <textarea
                      value={audioTranscript}
                      onChange={(e) => setAudioTranscript(e.target.value)}
                      className="w-full h-48 bg-input border border-border p-4 font-sans text-sm focus:outline-none focus:border-primary transition-colors text-foreground resize-none"
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
                      onClick={() => handleSave(audioTranscript)}
                      disabled={!audioTranscript.trim() || updateProfile.isPending}
                      className="py-3 px-8 bg-primary text-primary-foreground font-bold rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {updateProfile.isPending ? "Building your Voice DNA..." : "Generate Voice DNA →"}
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
