import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/transcribe", requireAuth, async (req, res) => {
  const { audioBase64, mime } = req.body;

  if (!audioBase64 || !mime) {
    res.status(400).json({ error: "audioBase64 and mime are required" });
    return;
  }

  const sarvamKey = process.env.SARVAM_API_KEY;

  if (!sarvamKey) {
    // Fallback: return placeholder transcript when no API key is configured
    res.json({ transcript: "" });
    return;
  }

  try {
    // Convert base64 to binary blob
    const buffer = Buffer.from(audioBase64, "base64");
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append("file", blob, `audio.${mime.split("/")[1] ?? "webm"}`);
    formData.append("model", "saarika:v2.5");
    formData.append("language_code", "unknown");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam transcription error:", errorText);
      res.status(500).json({ error: "Transcription failed" });
      return;
    }

    const data = (await response.json()) as { transcript?: string };
    res.json({ transcript: data.transcript ?? "" });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

export default router;
