"use client";

import { useState, useCallback, useRef } from "react";
import type { CaptchaSession, ChallengePrompt } from "./types";
import { useStrokeCapture } from "./use-stroke-capture";
import { Canvas, CANVAS_W, CANVAS_H } from "./Canvas";
import { MetricsPanel } from "./MetricsPanel";
import { StrokeGraph } from "./StrokeGraph";
import { scoringEngine } from "./scoring";

// -------------------------------------------------------
//  Challenge prompts — add / remove as needed
// -------------------------------------------------------
const challenges: ChallengePrompt[] = [
  { instruction: "Draw a flower", emoji: "\u{1F338}", category: "symbol" },
  { instruction: "Draw the number 5", emoji: "5", category: "number" },
  { instruction: "Draw a star", emoji: "\u2B50", category: "shape" },
  { instruction: "Draw a circle", emoji: "\u2B55", category: "shape" },
  { instruction: "Draw a heart", emoji: "\u2764\uFE0F", category: "symbol" },
];

function pickChallenge(): ChallengePrompt {
  return challenges[Math.floor(Math.random() * challenges.length)];
}

type Phase = "idle" | "drawing" | "submitted";

export function DrawCaptcha() {
  const [phase, setPhase] = useState<Phase>("idle");
  // Start with a fixed challenge for SSR; randomise on first user interaction
  const [challenge, setChallenge] = useState(challenges[0]);
  const [session, setSession] = useState<CaptchaSession | null>(null);
  const hasRandomised = useRef(false);

  const {
    strokes,
    startSession,
    beginStroke,
    addPoint,
    endStroke,
    undo,
    clear,
    buildSession,
  } = useStrokeCapture();

  // -------------------------------------------------------
  //  Handlers
  // -------------------------------------------------------

  const handleStart = useCallback(() => {
    // Randomise challenge on first interaction to avoid hydration mismatch
    if (!hasRandomised.current) {
      hasRandomised.current = true;
      setChallenge(pickChallenge());
    }
    startSession();
    setPhase("drawing");
  }, [startSession]);

  const handleClear = useCallback(() => {
    clear();
  }, [clear]);

  const handleSubmit = useCallback(() => {
    const data = buildSession(
      `${challenge.instruction} ${challenge.emoji}`,
      CANVAS_W,
      CANVAS_H,
    );

    // Log to console for inspection
    console.log("[DrawCAPTCHA] Session data:", data);

    // ============================================================
    // >>> RISK-SCORING HOOK <<<
    // All registered algorithms run here. See scoring.ts to add yours.
    // ============================================================
    const results = scoringEngine.evaluate(data);
    if (results.size > 0) {
      console.log(
        "[DrawCAPTCHA] Scoring results:",
        Object.fromEntries(results),
      );
    }

    // ============================================================
    // >>> ENDPOINT HOOK <<<
    // Send data to a backend for storage / deeper analysis:
    //
    //   await fetch("/api/captcha", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(data),
    //   });
    // ============================================================

    setSession(data);
    setPhase("submitted");
  }, [buildSession, challenge]);

  const handleRetry = useCallback(() => {
    clear();
    setSession(null);
    setChallenge(pickChallenge());
    setPhase("idle");
  }, [clear]);

  // -------------------------------------------------------
  //  Render
  // -------------------------------------------------------

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </span>
          <span className="ml-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            DrawCAPTCHA &mdash; Behavioral Study
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {/* ---------- IDLE ---------- */}
          {phase === "idle" && (
            <div className="flex flex-col items-center gap-5 py-8">
              <span className="text-6xl leading-none">{challenge.emoji}</span>

              <p className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                {challenge.instruction}
              </p>

              <p className="max-w-xs text-center text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                This demo captures behavioral signals from your drawing
                interaction for risk-analysis research.
              </p>

              <button
                onClick={handleStart}
                className="mt-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                Start Drawing &rarr;
              </button>
            </div>
          )}

          {/* ---------- DRAWING ---------- */}
          {phase === "drawing" && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {challenge.instruction}{" "}
                <span className="text-lg">{challenge.emoji}</span>
              </p>

              <Canvas
                isActive
                strokes={strokes}
                onStrokeStart={beginStroke}
                onStrokePoint={addPoint}
                onStrokeEnd={endStroke}
              />

              {/* Toolbar */}
              <div className="flex w-full max-w-[500px] items-center justify-between">
                <div className="flex gap-2">
                  <ToolBtn onClick={handleClear} disabled={strokes.length === 0}>
                    Clear
                  </ToolBtn>
                  <ToolBtn onClick={undo} disabled={strokes.length === 0}>
                    Undo
                  </ToolBtn>
                </div>

                <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                  {strokes.length} stroke{strokes.length !== 1 && "s"}
                </span>

                <button
                  onClick={handleSubmit}
                  disabled={strokes.length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* ---------- SUBMITTED ---------- */}
          {phase === "submitted" && session && (
            <div className="flex flex-col items-center gap-6">
              {/* Confirmation */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <svg
                    className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                  Thanks for drawing!
                </p>
              </div>

              {/* Visualisations */}
              <StrokeGraph
                strokes={session.strokes}
                sourceWidth={CANVAS_W}
                sourceHeight={CANVAS_H}
              />

              <MetricsPanel session={session} />

              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Full session data logged to browser console
              </p>

              <button
                onClick={handleRetry}
                className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small toolbar button */
function ToolBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}
