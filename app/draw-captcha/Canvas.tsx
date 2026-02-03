"use client";

import { useRef, useEffect, useCallback } from "react";
import type { CapturePoint, Stroke } from "./types";

/** Logical canvas dimensions (CSS-pixel space) */
export const CANVAS_W = 500;
export const CANVAS_H = 375;

interface CanvasProps {
  isActive: boolean;
  strokes: Stroke[];
  onStrokeStart: () => void;
  onStrokePoint: (point: CapturePoint) => void;
  onStrokeEnd: () => void;
}

/** Draw an array of points as a single path */
function drawPath(
  ctx: CanvasRenderingContext2D,
  points: CapturePoint[],
  dpr: number,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 2.5 * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(points[0].x * dpr, points[0].y * dpr);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * dpr, points[i].y * dpr);
  }
  ctx.stroke();
}

export function Canvas({
  isActive,
  strokes,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerDown = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const prevStrokeLen = useRef(0);
  const dpr = useRef(1);

  // Set canvas buffer size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    dpr.current = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr.current;
    canvas.height = CANVAS_H * dpr.current;
  }, []);

  // Full redraw when strokes are removed (undo / clear)
  useEffect(() => {
    if (strokes.length < prevStrokeLen.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const stroke of strokes) {
          drawPath(ctx, stroke.points, dpr.current);
        }
      }
    }
    prevStrokeLen.current = strokes.length;
  }, [strokes]);

  /** Convert a pointer event to a CapturePoint in logical coords */
  const toPoint = useCallback(
    (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>): CapturePoint => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;
      return {
        x: (clientX - rect.left) * (CANVAS_W / rect.width),
        y: (clientY - rect.top) * (CANVAS_H / rect.height),
        timestamp: performance.now(),
        pressure: (e as PointerEvent).pressure || 0.5,
        pointerType: ((e as PointerEvent).pointerType || "mouse") as CapturePoint["pointerType"],
      };
    },
    [],
  );

  // --- Pointer handlers ---

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isActive) return;
      e.preventDefault();
      pointerDown.current = true;

      const pt = toPoint(e);
      lastPt.current = { x: pt.x, y: pt.y };

      onStrokeStart();
      onStrokePoint(pt);

      canvasRef.current?.setPointerCapture(e.pointerId);
    },
    [isActive, toPoint, onStrokeStart, onStrokePoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerDown.current || !isActive) return;

      // Use coalesced events for higher-resolution capture when available
      const coalesced =
        (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [];
      const events =
        coalesced.length > 0 ? coalesced : [e.nativeEvent as PointerEvent];

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const d = dpr.current;

      for (const pe of events) {
        const pt: CapturePoint = {
          x: (pe.clientX - rect.left) * (CANVAS_W / rect.width),
          y: (pe.clientY - rect.top) * (CANVAS_H / rect.height),
          timestamp: performance.now(),
          pressure: pe.pressure || 0.5,
          pointerType: (pe.pointerType || "mouse") as CapturePoint["pointerType"],
        };

        onStrokePoint(pt);

        // Incremental draw for immediate visual feedback
        if (lastPt.current) {
          ctx.beginPath();
          ctx.strokeStyle = "#1a1a2e";
          ctx.lineWidth = 2.5 * d;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.moveTo(lastPt.current.x * d, lastPt.current.y * d);
          ctx.lineTo(pt.x * d, pt.y * d);
          ctx.stroke();
        }

        lastPt.current = { x: pt.x, y: pt.y };
      }
    },
    [isActive, onStrokePoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerDown.current) return;
      pointerDown.current = false;
      lastPt.current = null;
      onStrokeEnd();
      canvasRef.current?.releasePointerCapture(e.pointerId);
    },
    [onStrokeEnd],
  );

  return (
    <canvas
      ref={canvasRef}
      className={[
        "w-full max-w-[500px] rounded-xl border-2 bg-white touch-none",
        isActive
          ? "cursor-crosshair border-indigo-300 dark:border-indigo-500/60"
          : "cursor-default border-neutral-200 dark:border-neutral-700",
      ].join(" ")}
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
