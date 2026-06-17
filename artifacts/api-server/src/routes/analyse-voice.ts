import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/analyse-voice", requireAuth, async (req, res) => {
  const { text, audioDurationSeconds } = req.body as {
    text?: string;
    audioDurationSeconds?: number;
  };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const qwenKey = process.env.QWEN_API_KEY;
  if (!qwenKey) {
    res.status(500).json({ error: "QWEN_API_KEY not configured" });
    return;
  }

  const wordCount = text.trim().split(/\s+/).length;
  const wpm = audioDurationSeconds && audioDurationSeconds > 0
    ? Math.round((wordCount / audioDurationSeconds) * 60)
    : null;

  const systemPrompt = `You are Verniq's Voice DNA engine. Your job is to deeply analyse a creator's writing or speech and extract their unique voice signature across 8 dimensions.

You think like a master content strategist + voice coach. You notice things most people miss: rhythm, emotional undercurrents, power phrases, charisma markers.

Be specific and observant — never generic. Quote words or patterns from the actual text as evidence.`;

  const userPrompt = `Analyse this creator's content sample and extract their Voice DNA.
${wpm ? `\nAudio pacing detected: ~${wpm} words per minute` : ""}

CONTENT SAMPLE:
"""
${text.slice(0, 3000)}
"""

Analyse across exactly these 8 dimensions. For each, give a short punchy value + one-line evidence from the text.

Return ONLY valid JSON in this exact format:
{
  "steps": [
    {
      "category": "Formality Register",
      "emoji": "🎯",
      "value": "Casual (2/10)",
      "reasoning": "Uses contractions, direct 'you' address, no academic phrasing"
    },
    {
      "category": "Emotional Energy",
      "emoji": "⚡",
      "value": "High — expressive & charged",
      "reasoning": "Multiple exclamation patterns, urgency words like 'right now', 'massive'"
    },
    {
      "category": "Tone Character",
      "emoji": "🔮",
      "value": "Challenger Educator",
      "reasoning": "Pushes back on conventional wisdom, uses 'most people' contrast frames"
    },
    {
      "category": "Hook Signature",
      "emoji": "🪝",
      "value": "Bold claim opener",
      "reasoning": "Leads with a counterintuitive statement before explaining"
    },
    {
      "category": "Closing Style",
      "emoji": "🎬",
      "value": "Direct CTA",
      "reasoning": "Ends with action commands: 'follow', 'comment', 'share your take'"
    },
    {
      "category": "Sentence Rhythm",
      "emoji": "🎵",
      "value": "Staccato — punchy 6-word average",
      "reasoning": "Short declarative bursts, frequent sentence breaks for emphasis"
    },
    {
      "category": "Charisma Markers",
      "emoji": "✨",
      "value": "Relatable authority",
      "reasoning": "Mixes personal experience with confident statements, creates trust"
    },
    {
      "category": "Content Style",
      "emoji": "🧠",
      "value": "Motivational educator",
      "reasoning": "Combines insight delivery with inspirational framing"
    }
  ],
  "voiceDna": {
    "tone": "casual",
    "energy": "high",
    "avgSentenceLength": 8,
    "hookStyle": "bold statement",
    "closingStyle": "direct CTA",
    "signaturePhrases": ["here's the thing", "most people"],
    "formalityScore": 2,
    "sampleCount": 1,
    "source": "writer",
    "emotions": "enthusiastic, direct, confident",
    "charisma": "relatable authority",
    "pacing": "${wpm ? `${wpm} WPM — fast` : "text-based, punchy"}",
    "contentStyle": "motivational educator",
    "summary": "Casual & charged challenger. Opens bold, closes with action. Punchy rhythm that demands attention."
  }
}`;

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1400,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Qwen analyse-voice error:", errText);
      res.status(500).json({ error: "Analysis failed" });
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

    let parsed: { steps: unknown[]; voiceDna: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse analyse-voice JSON:", cleaned.slice(0, 300));
      res.status(500).json({ error: "Invalid analysis response" });
      return;
    }

    res.json({ steps: parsed.steps, voiceDna: parsed.voiceDna });
  } catch (err) {
    console.error("Analyse-voice error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
