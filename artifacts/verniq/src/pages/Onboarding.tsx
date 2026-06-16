import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useUpdateMyProfile, useTranscribeAudio } from "@workspace/api-client-react";
import { analyzeSamples } from "../lib/verniq-store";
import { Mic } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"writer" | "video">("writer");
  const [samples, setSamples] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  
  const updateProfile = useUpdateMyProfile();
  const transcribeAudio = useTranscribeAudio();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSave = (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    
    let parts = mode === "writer" ? textToAnalyze.split("---").map(s => s.trim()).filter(Boolean) : [textToAnalyze];
    if (parts.length === 0) return;

    const dna = analyzeSamples(parts, mode);
    updateProfile.mutate({
      data: { voice_dna: dna }
    }, {
      onSuccess: () => {
        setLocation("/create");
      }
    });
  };

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
              setAudioTranscript(res.transcript);
              handleSave(res.transcript);
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

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-12">
        <Logo />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">✓</div>
             <div className="h-0.5 w-8 bg-primary"></div>
             <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">02</div>
             <div className="h-0.5 w-8 bg-border"></div>
             <div className="w-8 h-8 rounded-full border border-border text-muted-foreground flex items-center justify-center font-bold text-sm">03</div>
             <div className="h-0.5 w-8 bg-border"></div>
             <div className="w-8 h-8 rounded-full border border-border text-muted-foreground flex items-center justify-center font-bold text-sm">04</div>
          </div>
        </div>
      </div>

      <header className="mb-12">
        <h1 className="text-4xl font-black font-sans mb-4">Initialize Voice DNA</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Verniq needs to learn your unique style. Provide samples of your previous work so we can build your profile.
        </p>
      </header>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          <button 
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'writer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setMode("writer")}
          >
            Writer
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setMode("video")}
          >
            Video creator
          </button>
        </div>

        <div className="p-8">
          {mode === "writer" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Paste 3+ writing samples</label>
                <p className="text-xs text-muted-foreground mb-4 font-mono">Separate each sample with "---"</p>
                <textarea 
                  value={samples}
                  onChange={(e) => setSamples(e.target.value)}
                  className="w-full h-64 bg-input border-0 rounded p-4 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-foreground"
                  placeholder="Sample 1 content goes here...&#10;---&#10;Sample 2 content goes here..."
                />
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => handleSave(samples)}
                  disabled={!samples.trim() || updateProfile.isPending}
                  className="py-3 px-6 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateProfile.isPending ? "Analyzing..." : "Analyze my voice →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 text-center py-8">
              <div>
                <label className="block text-lg font-bold mb-2">Speak naturally</label>
                <p className="text-sm text-muted-foreground mb-8">Record yourself talking about a topic for at least 30 seconds.</p>
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={transcribeAudio.isPending || updateProfile.isPending}
                  className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all ${isRecording ? 'bg-destructive/20 text-destructive border-4 border-destructive animate-pulse' : 'bg-primary/10 text-primary border-4 border-primary hover:bg-primary/20'} disabled:opacity-50`}
                >
                  <Mic className="w-12 h-12" />
                </button>
                
                <p className="mt-8 text-sm h-6 text-muted-foreground">
                  {isRecording ? "Recording... Click to stop." : 
                   transcribeAudio.isPending ? "Transcribing audio..." : 
                   updateProfile.isPending ? "Analyzing voice DNA..." : 
                   "Click to start recording"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}