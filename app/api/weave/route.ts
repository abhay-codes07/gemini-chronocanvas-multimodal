import { randomUUID } from "node:crypto";

import { buildWeavePrompt, geminiModel, type WeaveChunk } from "@/lib/gemini";
import { uploadAsset } from "@/lib/gcp-storage";

export const runtime = "nodejs";

type WeaveRequestBody = {
  transcript?: string;
  contextSummary?: string;
};

function serializeSse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractObjects(buffer: string): { objects: WeaveChunk[]; remainder: string } {
  const objects: WeaveChunk[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let isEscaped = false;
  let consumedUntil = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    const char = buffer[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth > 0) {
        depth -= 1;
      }

      if (depth === 0 && start !== -1) {
        const candidate = buffer.slice(start, i + 1);

        try {
          objects.push(JSON.parse(candidate) as WeaveChunk);
          consumedUntil = i + 1;
        } catch {
          // Keep buffering until valid JSON appears.
        }
      }
    }
  }

  return {
    objects,
    remainder: buffer.slice(consumedUntil),
  };
}

function createVisualSvg(description: string): string {
  const safeDescription = description.replace(/[<>&]/g, "").slice(0, 140);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#07111f" />
      <stop offset="100%" stop-color="#1a304d" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" rx="24" />
  <circle cx="980" cy="120" r="180" fill="#3dd9ff" fill-opacity="0.12" />
  <circle cx="180" cy="620" r="220" fill="#9a8cff" fill-opacity="0.10" />
  <text x="80" y="360" fill="#e9f2ff" font-family="Arial, sans-serif" font-size="44">
    ${safeDescription}
  </text>
</svg>
`.trim();
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function resolveVisualUrl(description: string): Promise<string> {
  const svg = createVisualSvg(description);
  const buffer = Buffer.from(svg, "utf-8");
  const destination = `generated/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.svg`;

  try {
    return await uploadAsset({
      buffer,
      contentType: "image/svg+xml",
      destination,
    });
  } catch {
    return svgToDataUrl(svg);
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: WeaveRequestBody;

  try {
    body = (await request.json()) as WeaveRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const transcript = body.transcript?.trim();

  if (!transcript) {
    return Response.json({ error: "A transcript is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(serializeSse(payload)));
      };

      try {
        const chat = geminiModel.startChat({
          generationConfig: {
            temperature: 0.85,
            responseMimeType: "application/json",
          },
        });

        const result = await chat.sendMessageStream(
          buildWeavePrompt({
            transcript,
            contextSummary: body.contextSummary,
          }),
        );

        let pending = "";

        for await (const chunk of result.stream) {
          pending += chunk.text();
          const { objects, remainder } = extractObjects(pending);
          pending = remainder;

          for (const item of objects) {
            if (item.type === "visual_prompt") {
              const url = await resolveVisualUrl(item.description);
              send({ type: "visual", prompt: item.description, url });
            } else {
              send(item);
            }
          }
        }

        send({ type: "done" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The timeline is unstable. Let us try again.";

        send({
          type: "error",
          message: message || "The timeline is unstable. Let us try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
