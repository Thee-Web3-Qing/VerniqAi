import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

interface VoiceDNA {
  tone: string;
  energy: string;
  avgSentenceLength: number;
  hookStyle: string;
  closingStyle: string;
  signaturePhrases: string[];
  formalityScore: number;
  sampleCount: number;
  source: string;
  summary: string;
}

router.post("/generate", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { idea } = req.body as { idea?: string };

  if (!idea?.trim()) {
    res.status(400).json({ error: "idea is required" });
    return;
  }

  const qwenKey = process.env.QWEN_API_KEY;
  if (!qwenKey) {
    res.status(500).json({ error: "QWEN_API_KEY not configured" });
    return;
  }

  // Load user's Voice DNA from DB
  const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, userId!));
  const profile = rows[0];
  const dna = profile?.voiceDna as VoiceDNA | null;

  const dnaContext = dna
    ? `Voice DNA profile:
- Tone: ${dna.tone}
- Energy: ${dna.energy}
- Hook style: ${dna.hookStyle}
- Closing style: ${dna.closingStyle}
- Formality (1-10): ${dna.formalityScore}
- Avg sentence length: ${Math.round(dna.avgSentenceLength)} words
- Signature phrases: ${dna.signaturePhrases.length > 0 ? dna.signaturePhrases.join(", ") : "none recorded"}
- Summary: ${dna.summary}`
    : "No Voice DNA profile yet — use a natural, engaging content creator voice.";

  const systemPrompt = `You are Verniq, an AI content repurposing engine. You generate TikTok scripts and Twitter threads that sound exactly like the creator based on their Voice DNA profile.

${dnaContext}

Rules:
- Match the creator's tone, energy, and style precisely
- TikTok scripts must have a hook (first 3 seconds), body, and CTA
- Twitter threads must be numbered (1/, 2/, etc.) with a punchy opener tweet
- Keep TikTok scripts under 300 words (60-90 sec spoken)
- Keep Twitter threads 5-7 tweets
- Do NOT add hashtags unless the voice DNA suggests them
- Do NOT add generic filler — every line must add value`;

  const userPrompt = `Generate content for this idea: "${idea}"

Respond with valid JSON in exactly this format (no markdown, no code blocks):
{
  "tiktok": "full tiktok script here as one string with newlines",
  "twitter": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"]
}`;

  try {
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${qwenKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Qwen API error:", errText);
      res.status(500).json({ error: "Generation failed", detail: errText });
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content ?? "";
    console.log("Qwen raw output:", raw.slice(0, 200));

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let parsed: { tiktok: string; twitter: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Qwen JSON:", cleaned);
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json({
      tiktok: parsed.tiktok ?? "",
      twitter: Array.isArray(parsed.twitter) ? parsed.twitter : [],
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
