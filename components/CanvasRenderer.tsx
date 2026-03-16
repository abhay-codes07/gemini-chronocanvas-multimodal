"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";

import type { WeaveRenderItem, WeaveRequest, WeaveSseEvent } from "@/types/weave";

type CanvasRendererProps = {
  request: WeaveRequest | null;
  onStatusChange?: (status: string) => void;
  onStreamStateChange?: (state: "idle" | "waiting" | "active" | "done" | "error") => void;
};

function TypingNarration({ text }: { text: string }): JSX.Element {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let index = 0;
    setVisibleText("");

    const timer = setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [text]);

  return <p className="text-base leading-relaxed text-slate-100 md:text-lg">{visibleText}</p>;
}

export function CanvasRenderer({
  request,
  onStatusChange,
  onStreamStateChange,
}: CanvasRendererProps): JSX.Element {
  const [items, setItems] = useState<WeaveRenderItem[]>([]);
  const activeRequestIdRef = useRef<string | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  useEffect(() => {
    const synth = window.speechSynthesis;

    const speakNext = (): void => {
      if (speakingRef.current || speechQueueRef.current.length === 0) {
        return;
      }

      const nextLine = speechQueueRef.current.shift();

      if (!nextLine) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(nextLine);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => {
        speakingRef.current = false;
        speakNext();
      };
      utterance.onerror = () => {
        speakingRef.current = false;
        speakNext();
      };

      speakingRef.current = true;
      synth.speak(utterance);
    };

    if (!request) {
      onStreamStateChange?.("idle");
      return;
    }

    activeRequestIdRef.current = request.id;
    setItems([]);
    speechQueueRef.current = [];
    synth.cancel();
    speakingRef.current = false;

    const controller = new AbortController();
    let seenFirstChunk = false;

    const appendItem = (item: WeaveRenderItem) => {
      startTransition(() => {
        setItems((previous) => [...previous, item]);
      });
    };

    const consumeStream = async (): Promise<void> => {
      onStatusChange?.("Weaving your timeline...");
      onStreamStateChange?.("waiting");

      const response = await fetch("/api/weave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: request.transcript }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        appendItem({
          id: crypto.randomUUID(),
          kind: "error",
          message: "The timeline is unstable. Let us try again.",
        });
        onStatusChange?.("The timeline is unstable. Let us try again.");
        onStreamStateChange?.("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done || activeRequestIdRef.current !== request.id) {
          break;
        }

        pending += decoder.decode(value, { stream: true });
        const parts = pending.split("\n\n");
        pending = parts.pop() ?? "";

        for (const part of parts) {
          const line = part
            .split("\n")
            .find((entry) => entry.trimStart().startsWith("data:"));

          if (!line) {
            continue;
          }

          if (!seenFirstChunk) {
            seenFirstChunk = true;
            onStreamStateChange?.("active");
          }

          const payload = line.replace(/^data:\s?/, "");

          let event: WeaveSseEvent;

          try {
            event = JSON.parse(payload) as WeaveSseEvent;
          } catch {
            continue;
          }

          if (event.type === "narration") {
            appendItem({
              id: crypto.randomUUID(),
              kind: "narration",
              text: event.text,
            });
            speechQueueRef.current.push(event.text);
            speakNext();
            onStatusChange?.("Narration arriving...");
          }

          if (event.type === "transition") {
            appendItem({
              id: crypto.randomUUID(),
              kind: "transition",
              cue: event.cue,
            });
          }

          if (event.type === "visual") {
            appendItem({
              id: crypto.randomUUID(),
              kind: "visual",
              prompt: event.prompt,
              url: event.url,
            });
            synth.pause();
            setTimeout(() => {
              synth.resume();
            }, 450);
            onStatusChange?.("Visual frame rendered...");
          }

          if (event.type === "error") {
            appendItem({
              id: crypto.randomUUID(),
              kind: "error",
              message: event.message,
            });
            onStatusChange?.(event.message);
            onStreamStateChange?.("error");
          }

          if (event.type === "done") {
            onStatusChange?.("Timeline stitched. Hold to continue the story.");
            onStreamStateChange?.("done");
          }
        }
      }
    };

    void consumeStream();

    return () => {
      controller.abort();
      synth.cancel();
      speechQueueRef.current = [];
      speakingRef.current = false;
    };
  }, [onStatusChange, onStreamStateChange, request]);

  return (
    <section className="relative z-10 mt-4 w-full max-w-4xl rounded-3xl border border-white/10 bg-canvas-soft/70 p-4 shadow-aura backdrop-blur-md sm:mt-8 sm:p-6 md:p-10">
      <p className="text-xs uppercase tracking-[0.24em] text-glow-cyan/80">ChronoCanvas</p>
      <h1 className="mt-3 text-2xl font-semibold text-white sm:mt-4 sm:text-3xl md:text-5xl">Speak worlds into existence.</h1>
      <p className="mt-3 text-sm text-slate-200 md:mt-4 md:text-base">
        No chat boxes. Press and hold the mic, describe a place or scene, and release to stream a cinematic response.
      </p>

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              {item.kind === "narration" ? <TypingNarration text={item.text} /> : null}
              {item.kind === "transition" ? (
                <p className="text-xs uppercase tracking-[0.15em] text-glow-cyan/85">{item.cue}</p>
              ) : null}
              {item.kind === "visual" ? (
                <figure className="space-y-2">
                  <Image
                    src={item.url}
                    alt={item.prompt}
                    width={1280}
                    height={720}
                    unoptimized
                    className="h-auto w-full rounded-xl border border-white/15 object-cover image-focus"
                  />
                  <figcaption className="text-xs text-slate-300">{item.prompt}</figcaption>
                </figure>
              ) : null}
              {item.kind === "error" ? <p className="text-sm text-rose-300">{item.message}</p> : null}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
