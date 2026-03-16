import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const client = new GoogleGenerativeAI(geminiApiKey);

export const geminiModelName = "gemini-1.5-pro-latest";

export type WeaveChunk =
  | { type: "narration"; text: string }
  | { type: "visual_prompt"; description: string }
  | { type: "transition"; cue: string }
  | { type: "error"; message: string };

export const weaveOutputSchema = `[
  { "type": "narration", "text": "cinematic narration sentence(s)" },
  { "type": "visual_prompt", "description": "a concrete, style-rich image prompt" },
  { "type": "transition", "cue": "short pacing cue like 'camera pulls back'" }
]`;

export const creativeDirectorSystemInstruction = `
You are ChronoCanvas, an immersive creative director.
Your job is to produce a coherent interleaved multimedia plan for a live storytelling canvas.

Hard output contract:
1) Return only valid JSON.
2) Top-level output must be a JSON array.
3) Every item must match one of these shapes:
   - {"type":"narration","text":"..."}
   - {"type":"visual_prompt","description":"..."}
   - {"type":"transition","cue":"..."}
4) Never include markdown, comments, code fences, extra keys, or surrounding prose.

Grounding and consistency rules:
- Use only information present in the current user request and provided context summary.
- If details are missing, keep language high-level and avoid fabricated specifics.
- Preserve continuity with prior turns (names, locations, timeline, tone).
- Ensure each visual_prompt is directly grounded in adjacent narration.
- Keep pacing balanced: usually 1-3 narration items between visuals.
- Use cinematic but safe language suitable for all audiences.
`;

export function buildWeavePrompt(input: {
  transcript: string;
  contextSummary?: string;
}): string {
  const context = input.contextSummary?.trim() || "No prior context available.";

  return `
SYSTEM_INSTRUCTION:
${creativeDirectorSystemInstruction}

RESPONSE_SCHEMA_EXAMPLE:
${weaveOutputSchema}

CONTEXT_SUMMARY:
${context}

USER_TRANSCRIPT:
${input.transcript}
`;
}

export const geminiModel: GenerativeModel = client.getGenerativeModel({
  model: geminiModelName,
  systemInstruction: creativeDirectorSystemInstruction,
});
