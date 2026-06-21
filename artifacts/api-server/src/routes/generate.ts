import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable, organizationsTable } from "@workspace/db";
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
  const { idea, platform = "tiktok", creatorId, orgId } = req.body as {
    idea?: string;
    platform?: Platform;
    creatorId?: string;
    orgId?: string;
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

  let dna: VoiceDNA | null = null;
  let paymentInfo: { walletAddress: string; priceUsd: number; creatorName: string; creatorId: string } | null = null;
  let userLanguage = "english";

  if (orgId) {
    const orgRows = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
    if (orgRows.length === 0) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    dna = orgRows[0].voiceDna as VoiceDNA | null;
    const langRow = await db.select({ language: profilesTable.language }).from(profilesTable).where(eq(profilesTable.id, userId!));
    userLanguage = langRow[0]?.language ?? "english";
  } else if (creatorId) {
    const creatorRows = await db.select().from(profilesTable).where(eq(profilesTable.id, creatorId));
    if (creatorRows.length === 0 || !creatorRows[0].isPublicCreator) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    const creator = creatorRows[0];
    dna = creator.voiceDna as VoiceDNA | null;

    await db
      .update(profilesTable)
      .set({ totalGenerationsSold: creator.totalGenerationsSold + 1 })
      .where(eq(profilesTable.id, creatorId));

    if (creator.walletAddress && creator.pricePerGeneration > 0) {
      paymentInfo = {
        walletAddress: creator.walletAddress,
        priceUsd: creator.pricePerGeneration / 100,
        creatorName: creator.displayName || "Anonymous Creator",
        creatorId: creator.id,
      };
    }

    const langRow = await db.select({ language: profilesTable.language }).from(profilesTable).where(eq(profilesTable.id, userId!));
    userLanguage = langRow[0]?.language ?? "english";
  } else {
    const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
    dna = rows[0]?.voiceDna as VoiceDNA | null;
    userLanguage = rows[0]?.language ?? "english";
  }

  const dnaContext = dna
    ? `CREATOR'S VOICE DNA (study the STYLE — never copy their words):
- Tone: ${dna.tone}
- Energy: ${dna.energy}
- Hook style: ${dna.hookStyle}
- Closing style: ${dna.closingStyle}
- Formality (1–10): ${dna.formalityScore}
- Avg sentence length: ~${Math.round(dna.avgSentenceLength)} words — MATCH THIS LENGTH per sentence
- Emotions: ${dna.emotions ?? "not specified"}
- Charisma: ${dna.charisma ?? "not specified"}
- Pacing: ${dna.pacing ?? "not specified"}
- Content style: ${dna.contentStyle ?? "not specified"}
- Phrase patterns (DO NOT quote these verbatim — mimic the PATTERN and cadence only): ${dna.signaturePhrases.length > 0 ? dna.signaturePhrases.join(", ") : "none"}
- Voice summary: ${dna.summary}`
    : "No Voice DNA — write in a natural, engaging, conversational voice.";

  const languageInstruction = userLanguage !== "english"
    ? `\nLANGUAGE: Write ALL content in ${userLanguage}. Every single word must be in ${userLanguage} — do not mix languages.`
    : "";

  const systemPrompt = `You are Verniq, a precision AI content engine. You write ${platformInfo.name} content that sounds EXACTLY like this specific creator — not like generic AI.

${dnaContext}${languageInstruction}

ABSOLUTE RULES — NEVER BREAK THESE:
1. ZERO WORD LIFTING: You must NOT copy, quote, reuse, or echo any specific words, phrases, or sentences from the creator's samples. The samples teach you HOW they communicate — their rhythm, tone, and attitude. You generate 100% fresh, original content on the new topic.
2. FULL SENTENCES ONLY: Every single line of content must be a complete, grammatically correct sentence with a subject and a verb. No 3-word fragments. No dangling phrases. No incomplete thoughts. If a sentence feels short, complete it properly.
3. VOICE MATCHING: Capture their tone, energy, sentence rhythm, and emotional register — through the structure and attitude of your writing, not by repeating their words.`;

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

    res.json({
      platform: parsed.platform ?? platform,
      output: parsed.output ?? "",
      parts: Array.isArray(parsed.parts) ? parsed.parts : null,
      payment: paymentInfo ?? null,
      tiktok: parsed.output ?? "",
      twitter: Array.isArray(parsed.parts) ? parsed.parts : null,
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
