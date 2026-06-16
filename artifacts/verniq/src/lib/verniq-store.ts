export interface VoiceDNA {
  tone: string;
  energy: string;
  avgSentenceLength: number;
  hookStyle: string;
  closingStyle: string;
  signaturePhrases: string[];
  formalityScore: number;
  sampleCount: number;
  source: "writer" | "video";
  summary: string;
  lastUpdated: string;
}

export const WORKFLOW_STEPS = [
  "Input Processing — cleaning & extracting core topic",
  "Voice DNA Retrieval — loading your style profile",
  "Prompt Engineering — building a voice-matched prompt",
  "Content Generation — running model in parallel",
  "Voice Match Scoring — comparing against your DNA",
  "Output Delivery — packaging results",
  "Profile Learning — weighting accepted outputs"
] as const;

export function analyzeSamples(samples: string[], source: "writer" | "video"): VoiceDNA {
  const combined = samples.join(" ");
  const sentences = combined.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const words = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
  const avgLen = sentences.length > 0 ? words / sentences.length : 0;

  const questions = sentences.filter(s => combined.includes(s + "?")).length;
  const exclamations = sentences.filter(s => combined.includes(s + "!")).length;

  let hookStyle = "story setup";
  if (sentences.length > 0) {
    if (questions / sentences.length > 0.2) hookStyle = "question";
    else if (exclamations / sentences.length > 0.15) hookStyle = "bold statement";
    else if (avgLen < 8) hookStyle = "punchy one-liner";
  }

  let closingStyle = "rhetorical question";
  if (/follow|share|comment|subscribe|dm/i.test(combined)) closingStyle = "direct CTA";
  else if (exclamations > 2) closingStyle = "bold statement";

  const formalWords = ["furthermore", "therefore", "moreover", "consequently"];
  const casualWords = ["gonna", "wanna", "y'all", "lol", "tbh", "ngl", "fr"];
  let formalityScore = 5;
  if (formalWords.some(w => combined.toLowerCase().includes(w))) formalityScore = 8;
  else if (casualWords.some(w => combined.toLowerCase().includes(w))) formalityScore = 2;

  let energy = "balanced";
  if (sentences.length > 0 && (exclamations / sentences.length > 0.2 || avgLen < 9)) energy = "punchy";
  else if (avgLen > 18) energy = "measured";

  let tone = "direct";
  if (formalityScore >= 7) tone = "formal";
  else if (formalityScore <= 3) tone = "casual";

  const signaturePhrases: string[] = []; // Simplified for the sake of the mock
  
  const summary = `${tone.charAt(0).toUpperCase() + tone.slice(1)} & ${energy}. Opens with ${hookStyle}, closes with ${closingStyle}. Average ${Math.round(avgLen)}-word sentences.`;

  return {
    tone,
    energy,
    avgSentenceLength: avgLen,
    hookStyle,
    closingStyle,
    signaturePhrases,
    formalityScore,
    sampleCount: samples.length,
    source,
    summary,
    lastUpdated: new Date().toISOString()
  };
}

export function generateTikTok(idea: string, dna: VoiceDNA): string {
  return `[HOOK] ${idea.slice(0, 30)}...
[CONTEXT] Setting the stage...
[MEAT] The core content delivered with ${dna.energy} energy.
[LANDING] Bringing it home.
[CTA] ${dna.closingStyle === 'direct CTA' ? 'Follow for more!' : 'Thoughts?'}`;
}

export function generateTwitter(idea: string, dna: VoiceDNA): string[] {
  return [
    `1/ ${idea.slice(0, 50)}`,
    `2/ Here is the ${dna.tone} context.`,
    `3/ The turning point.`,
    `4/ Some evidence.`,
    `5/ The lesson.`,
    `6/ ${dna.closingStyle === 'direct CTA' ? 'Follow me' : 'Agree?'}`
  ];
}

export function scoreVoiceMatch(dna: VoiceDNA): number {
  return Math.round(78 + Math.min(12, dna.sampleCount * 1.5) + Math.min(6, dna.signaturePhrases.length * 1.5));
}
