"use client";

import { Mic } from "lucide-react";
import { useRef, useState } from "react";

type StreamEvent = {
  type: string;
  text?: string;
  message?: string;
  url?: string;
};

async function streamWeave(
  transcript: string,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const response = await fetch("/api/weave", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok || !response.body) {
    onEvent({
      type: "error",
      message: "The timeline is unstable. Let us try again.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    pending += decoder.decode(value, { stream: true });
    const parts = pending.split("\n\n");
    pending = parts.pop() ?? "";

    for (const block of parts) {
      const line = block
        .split("\n")
        .find((entry) => entry.trimStart().startsWith("data:"));

      if (!line) {
        continue;
      }

      const payload = line.replace(/^data:\s?/, "");

      try {
        onEvent(JSON.parse(payload) as StreamEvent);
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
}

export default function Home(): JSX.Element {
  const [isListening, setIsListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [previewTranscript, setPreviewTranscript] = useState("");
  const [status, setStatus] = useState("Hold to speak and describe your world.");

  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldSubmitOnEndRef = useRef(false);

  const submitTranscript = async (): Promise<void> => {
    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      setStatus("We did not catch that. Hold to speak again.");
      return;
    }

    setIsStreaming(true);
    setStatus("Weaving your timeline...");

    await streamWeave(transcript, (event) => {
      if (event.type === "error") {
        setStatus(event.message ?? "The timeline is unstable. Let us try again.");
        return;
      }

      if (event.type === "done") {
        setStatus("Timeline stitched. Hold to continue the story.");
        return;
      }

      if (event.type === "narration") {
        setStatus("Narration arriving...");
      }

      if (event.type === "visual") {
        setStatus("Visual frame rendered...");
      }
    });

    setIsStreaming(false);
  };

  const handlePressStart = (): void => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = "";
    setPreviewTranscript("");
    setStatus("Listening...");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let current = "";

      for (let i = 0; i < event.results.length; i += 1) {
        current += `${event.results[i][0].transcript} `;
      }

      transcriptRef.current = current.trim();
      setPreviewTranscript(current.trim());
    };

    recognition.onend = () => {
      setIsListening(false);

      if (shouldSubmitOnEndRef.current) {
        shouldSubmitOnEndRef.current = false;
        void submitTranscript();
      }
    };

    recognition.onerror = () => {
      setStatus("Microphone error. Please try again.");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handlePressEnd = (): void => {
    if (!recognitionRef.current || !isListening) {
      return;
    }

    shouldSubmitOnEndRef.current = true;
    recognitionRef.current.stop();
    setStatus("Transcribing and sending...");
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-cinematic-radial px-6 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(61,217,255,0.2),transparent_45%)]" />

      <section className="relative z-10 mt-8 w-full max-w-4xl rounded-3xl border border-white/10 bg-canvas-soft/70 p-6 shadow-aura backdrop-blur-md md:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-glow-cyan/80">ChronoCanvas</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-5xl">
          Speak worlds into existence.
        </h1>
        <p className="mt-4 text-sm text-slate-200 md:text-base">
          No chat boxes. Press and hold the mic, describe a place or scene, and release to stream a cinematic response.
        </p>
        <p className="mt-6 min-h-10 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100">
          {previewTranscript || status}
        </p>
      </section>

      <div className="relative z-10 mb-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          onPointerLeave={isListening ? handlePressEnd : undefined}
          disabled={isStreaming}
          className="group relative inline-flex h-24 w-24 items-center justify-center rounded-full border border-glow-cyan/45 bg-canvas-muted shadow-aura transition disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Hold to Speak"
        >
          <span
            className={`absolute inset-0 rounded-full ${
              isListening
                ? "animate-ping bg-glow-cyan/20"
                : "bg-glow-cyan/10 transition group-hover:scale-105"
            }`}
          />
          <Mic className="relative h-9 w-9 text-glow-cyan" />
        </button>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
          {isListening ? "Release to weave" : "Hold to speak"}
        </p>
      </div>
    </main>
  );
}
