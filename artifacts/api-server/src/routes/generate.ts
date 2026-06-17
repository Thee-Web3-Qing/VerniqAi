import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

type Platform =
  | "tiktok"
  | "twitter"
  | "instagram"
  | "youtube-shorts"
  | "linkedin"
  | "podcast"
  | "newsletter";

interface VoiceDNA {
  tone: string;
  energy: string;
  avgSentenceLength: number;
  hookStyle: string;
  closingStyle: string;
  signaturePhrases: string[];
  formalityScore: number;
  emotions?: string;
  charisma?: string;
  pacing?: string;
  contentStyle?: string;
  summary: string;
}

const PLATFORM_INSTRUCTIONS: Record<Platform, { name: string; format: string; instructions: string }> = {
  tiktok: {
    name: "TikTok",
    format: "60–90 second spoken script",
    instructions: `TikTok content rules:
- Hook MUST grab attention in the first 2-3 seconds (pattern interrupt, bold claim, or relatable moment)
- Keep it under 200 words spoken (60–90s at natural pace)
- Structure: [HOOK] → [SETUP] → [TWIST or REVEAL] → [LANDING] → [CTA]
- Use line breaks to indicate natural pauses
- Conversational, raw, authentic — no polished corporate language
- Visual cues in [brackets] for what to show on screen`,
  },
  twitter: {
    name: "Twitter / X",
    format: "6–8 tweet thread",
    instructions: `Twitter/X thread rules:
- Tweet 1 (the hook): Bold claim, hot take, or shocking stat. Must make people NEED to read on. Under 200 chars.
- Tweets 2–6: Each delivers one clear point with evidence or story
- Tweet 7: The twist, counterintuitive insight, or "here's what most people miss"
- Final tweet: Actionable CTA or question to drive replies
- Each tweet under 260 characters
- Use short sentences, em dashes, and line breaks for rhythm
- Number format: 1/ 2/ etc.`,
  },
  instagram: {
    name: "Instagram Reels",
    format: "30–60 second voiceover script",
    instructions: `Instagram Reels rules:
- Hook in first 1-2 seconds — visual + audio hook combined
- 100–150 words max (30–60s)
- Include [VISUAL:] stage directions describing what to film
- Aesthetic + authentic balance — slightly more polished than TikTok
- Trending audio cue suggestion at the end
- Caption (first line only) that stops the scroll
- Structure: [HOOK] → [STORY/VALUE] → [LESSON] → [CTA/SAVE]`,
  },
  "youtube-shorts": {
    name: "YouTube Shorts",
    format: "45–60 second educational script",
    instructions: `YouTube Shorts rules:
- Open with "Did you know..." or "Most people don't..." hook
- 150–200 words (45–60 seconds)
- Value-first: deliver the useful insight quickly
- Educational tone — teach something specific
- Include a "wait for it" moment to retain viewers
- End with a reason to subscribe or watch another video
- Structure: [HOOK] → [CONTEXT] → [INSIGHT 1] → [INSIGHT 2] → [PAYOFF] → [SUBSCRIBE CTA]`,
  },
  linkedin: {
    name: "LinkedIn",
    format: "Professional story post (150–300 words)",
    instructions: `LinkedIn post rules:
- Opening line must stop the scroll — personal story, bold claim, or counterintuitive truth
- NO "I'm excited to announce" or corporate clichés
- Personal vulnerability + professional insight combination
- Story arc: personal struggle → turning point → lesson learned → how it applies to others
- Short paragraphs (1–3 sentences), lots of white space
- End with a genuine question to spark comments
- 150–300 words
- Subtle professional authority without bragging`,
  },
  podcast: {
    name: "Podcast",
    format: "Episode intro + talking points",
    instructions: `Podcast content rules:
- Intro script (30 seconds): Hook + episode premise + why they should listen
- 5–7 talking points with sub-bullets (what to cover under each)
- Outro script (15 seconds): CTA + next episode tease
- Conversational, long-form tone — like speaking to one person
- Natural transitions between points
- Include "story moment" suggestion for engagement
- Format: Intro script → Talking Points array → Outro script`,
  },
  newsletter: {
    name: "Newsletter",
    format: "Email with subject line + body",
    instructions: `Newsletter/email rules:
- Subject line: curiosity gap or specific benefit. Under 50 chars. No clickbait.
- Preview text: 1 compelling sentence
- Opening: personal hook — not "Hi [name]"
- Body: 3 short paragraphs max. One idea per paragraph.
- PS line: the most important thing (people always read PS)
- Conversational, like writing to one person
- Clear single CTA
- Format: subject / preview / body paragraphs array / ps`,
  },
};

router.post("/generate", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { idea, platform = "tiktok" } = req.body as {
    idea?: string;
    platform?: Platform;
  };

  if (!idea?.trim()) {
    res.status(400).json({ error: "idea is required" });
    return;
  }

  const qwenKey = process.env.QWEN_API_KEY;
  if (!qwenKey) {
    res.status(500).json({ error: "QWEN_API_KEY not configured" });
    return;
  }

  const platformInfo = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.tiktok;

  const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
  const profile = rows[0];
  const dna = profile?.voiceDna as VoiceDNA | null;

  const dnaContext = dna
    ? `CREATOR'S VOICE DNA:
- Tone: ${dna.tone}
- Energy: ${dna.energy}  
- Hook style: ${dna.hookStyle}
- Closing style: ${dna.closingStyle}
- Formality (1–10): ${dna.formalityScore}
- Avg sentence length: ${Math.round(dna.avgSentenceLength)} words
- Emotions: ${dna.emotions ?? "not specified"}
- Charisma: ${dna.charisma ?? "not specified"}
- Pacing: ${dna.pacing ?? "not specified"}
- Content style: ${dna.contentStyle ?? "not specified"}
- Signature phrases: ${dna.signaturePhrases.length > 0 ? dna.signaturePhrases.join(", ") : "none recorded"}
- Voice summary: ${dna.summary}`
    : "No Voice DNA — use an engaging, natural creator voice.";

  const systemPrompt = `You are Verniq, a precision AI content engine. You generate ${platformInfo.name} content that sounds EXACTLY like the creator — not generic AI output.

${dnaContext}

CRITICAL: Every word must feel like it came from this specific creator. Match their tone, energy, sentence length, and vocabulary precisely.`;

  const userPrompt = `Generate ${platformInfo.name} content for this idea: "${idea}"

${platformInfo.instructions}

IMPORTANT: Return ONLY valid JSON. No markdown. No code fences. Exactly this format:
${
  platform === "twitter"
    ? `{"platform":"twitter","output":"","parts":["1/ tweet one","2/ tweet two","3/ tweet three","4/ tweet four","5/ tweet five","6/ tweet six"]}`
    : platform === "podcast"
    ? `{"platform":"podcast","output":"[INTRO SCRIPT]\\n30-second spoken intro here","parts":["Talking point 1: topic — what to cover","Talking point 2: topic — what to cover","Talking point 3: topic — what to cover","Talking point 4: topic — what to cover","Talking point 5: topic — what to cover","[OUTRO] 15-second outro script"]}`
    : platform === "newsletter"
    ? `{"platform":"newsletter","output":"Subject: Your subject line here\\nPreview: One compelling preview line","parts":["Opening paragraph","Second paragraph","Third paragraph","PS: Your PS line here"]}`
    : `{"platform":"${platform}","output":"full script content here as one string with newlines","parts":null}`
}`;

  try {
    const response = await fetch(
      "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3.7-plus",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.85,
          max_tokens: 1400,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Qwen generate error:", errText);
      res.status(500).json({ error: "Generation failed" });
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed: { platform: string; output: string; parts: string[] | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse generate JSON:", cleaned.slice(0, 300));
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    // Keep backwards-compat fields alongside new ones
    res.json({
      platform: parsed.platform ?? platform,
      output: parsed.output ?? "",
      parts: Array.isArray(parsed.parts) ? parsed.parts : null,
      // legacy
      tiktok: parsed.output ?? "",
      twitter: Array.isArray(parsed.parts) ? parsed.parts : null,
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
