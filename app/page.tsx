"use client";

import { Mic } from "lucide-react";
import { useRef, useState } from "react";

import { CanvasRenderer } from "@/components/CanvasRenderer";
import type { WeaveRequest } from "@/types/weave";

type StreamState = "idle" | "waiting" | "active" | "done" | "error";

export default function Home(): JSX.Element {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Hold to speak and describe your world.");
  const [request, setRequest] = useState<WeaveRequest | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("idle");

  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldSubmitOnEndRef = useRef(false);

  const isStreaming = streamState === "waiting" || streamState === "active";
  const isWaitingForFirstChunk = streamState === "waiting";

  const submitTranscript = (): void => {
    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      setStatus("We did not catch that. Hold to speak again.");
      return;
    }

    setStreamState("waiting");
    setRequest({ id: crypto.randomUUID(), transcript });
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
    setStatus("Listening...");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let current = "";

      for (let i = 0; i < event.results.length; i += 1) {
        current += `${event.results[i][0].transcript} `;
      }

      transcriptRef.current = current.trim();
      setStatus(current.trim() || "Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);

      if (shouldSubmitOnEndRef.current) {
        shouldSubmitOnEndRef.current = false;
        submitTranscript();
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
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-cinematic-radial px-4 py-6 text-foreground sm:px-6 sm:py-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(61,217,255,0.2),transparent_45%)]" />

      <CanvasRenderer
        request={request}
        onStatusChange={setStatus}
        onStreamStateChange={(state) => {
          setStreamState(state);
        }}
      />

      <div className="relative z-10 mb-2 flex flex-col items-center gap-3 sm:mb-4">
        <button
          type="button"
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          onPointerLeave={isListening ? handlePressEnd : undefined}
          disabled={isStreaming}
          className="group relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-glow-cyan/45 bg-canvas-muted shadow-aura transition disabled:cursor-not-allowed disabled:opacity-70 sm:h-24 sm:w-24"
          aria-label="Hold to Speak"
        >
          <span
            className={`absolute rounded-full ${
              isWaitingForFirstChunk
                ? "-inset-4 animate-pulse border border-glow-cyan/55 bg-glow-cyan/15"
                : "inset-0 bg-glow-cyan/10 transition group-hover:scale-105"
            }`}
          />
          <Mic className="relative h-8 w-8 text-glow-cyan sm:h-9 sm:w-9" />
        </button>
        <p className="max-w-xl text-center text-xs uppercase tracking-[0.18em] text-slate-300">{status}</p>
      </div>
    </main>
  );
}
