import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/tour-suggestions", async (req, res) => {
  const { tourName } = req.body as { tourName?: string };

  if (!tourName || tourName.trim().length < 3) {
    res.status(400).json({ error: "Tour name must be at least 3 characters." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are a travel package naming expert specializing in Pakistani tourism.
Given an informal tour name, generate exactly 3 formal tour package names.
IMPORTANT: Do NOT include any company or brand name in the tour names — use only destination and experience words.
Each name must have a SHORT one-line description of 8 words or fewer.
Return ONLY a valid JSON array — no markdown, no explanation:
[
  {"name":"Formal Package Name","description":"8-word max description."},
  {"name":"Alternative Package Name","description":"8-word max description."},
  {"name":"Third Package Name","description":"8-word max description."}
]`,
        },
        {
          role: "user",
          content: `Suggest formal names for: "${tourName.trim()}"`,
        },
      ],
    });

    let buffer = "";
    const sent = new Set<number>();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      buffer += delta;

      // Extract complete JSON objects from the buffer as they arrive
      const objectPattern = /\{[^{}]*"name"\s*:\s*"[^"]+"\s*,\s*"description"\s*:\s*"[^"]+"\s*\}/g;
      let match;
      while ((match = objectPattern.exec(buffer)) !== null) {
        const idx = sent.size;
        if (!sent.has(match.index)) {
          sent.add(match.index);
          try {
            const suggestion = JSON.parse(match[0]) as { name: string; description: string };
            res.write(`data: ${JSON.stringify({ suggestion, index: idx })}\n\n`);
          } catch {
            // skip malformed match
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    req.log?.error(err, "tour-suggestions error");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate suggestions." })}\n\n`);
    res.end();
  }
});

export default router;
