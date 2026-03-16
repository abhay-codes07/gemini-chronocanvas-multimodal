"use client";

import { Mic } from "lucide-react";
import { useRef, useState } from "react";

import { CanvasRenderer } from "@/components/CanvasRenderer";
import type { WeaveRequest } from "@/types/weave";

export default function Home(): JSX.Element {
  const [isListening, setIsListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState("Hold to speak and describe your world.");
  const [request, setRequest] = useState<WeaveRequest | null>(null);

  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldSubmitOnEndRef = useRef(false);

  const submitTranscript = (): void => {
    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      setStatus("We did not catch that. Hold to speak again.");
      return;
    }

    setIsStreaming(true);
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
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-cinematic-radial px-6 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(61,217,255,0.2),transparent_45%)]" />

      <CanvasRenderer
        request={request}
        onStatusChange={(nextStatus) => {
          setStatus(nextStatus);
          if (nextStatus.includes("Timeline stitched") || nextStatus.includes("unstable")) {
            setIsStreaming(false);
          }
        }}
      />

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
        <p className="text-center text-xs uppercase tracking-[0.18em] text-slate-300">{status}</p>
      </div>
    </main>
  );
}
