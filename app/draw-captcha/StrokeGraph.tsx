"use client";

import { useRef, useEffect } from "react";
import type { Stroke } from "./types";

interface StrokeGraphProps {
  strokes: Stroke[];
  sourceWidth: number;
  sourceHeight: number;
}

/** Map velocity to a hue: blue (slow) → red (fast) */
function velocityColor(v: number, maxV: number): string {
  if (maxV === 0) return "hsl(220, 80%, 55%)";
  const t = Math.min(v / maxV, 1);
  const hue = (1 - t) * 220; // 220 → 0
  return `hsl(${hue}, 80%, 55%)`;
}

/**
 * Renders a velocity heat-map of the captured drawing.
 * Each line segment is coloured by its instantaneous speed.
 */
export function StrokeGraph({
  strokes,
  sourceWidth,
  sourceHeight,
}: StrokeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = (w * dpr) / sourceWidth;
    const sy = (h * dpr) / sourceHeight;

    // Find global max velocity for normalisation
    let maxV = 0;
    for (const s of strokes) maxV = Math.max(maxV, s.metrics.maxVelocity);

    for (const stroke of strokes) {
      const pts = stroke.points;
      if (pts.length < 2) continue;

      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const dt = pts[i].timestamp - pts[i - 1].timestamp;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vel = dt > 0 ? dist / dt : 0;

        ctx.beginPath();
        ctx.strokeStyle = velocityColor(vel, maxV);
        ctx.lineWidth = 2.5 * dpr;
        ctx.lineCap = "round";
        ctx.moveTo(pts[i - 1].x * sx, pts[i - 1].y * sy);
        ctx.lineTo(pts[i].x * sx, pts[i].y * sy);
        ctx.stroke();
      }
    }
  }, [strokes, sourceWidth, sourceHeight]);

  return (
    <div className="w-full space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        Velocity Map
      </h3>

      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-700"
        style={{ aspectRatio: `${sourceWidth} / ${sourceHeight}` }}
      />

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "hsl(220, 80%, 55%)" }}
          />
          Slow
        </span>
        <span
          className="mx-2 h-1.5 flex-1 rounded-full"
          style={{
            background:
              "linear-gradient(to right, hsl(220,80%,55%), hsl(120,80%,55%), hsl(40,80%,55%), hsl(0,80%,55%))",
          }}
        />
        <span className="flex items-center gap-1">
          Fast
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "hsl(0, 80%, 55%)" }}
          />
        </span>
      </div>
    </div>
  );
}
