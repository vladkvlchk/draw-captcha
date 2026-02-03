"use client";

import { useCallback, useRef, useState } from "react";
import type { CapturePoint, Stroke, CaptchaSession } from "./types";
import { computeStrokeMetrics } from "./metrics";

/** Hook that manages stroke-level data capture and session building */
export function useStrokeCapture() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const currentPoints = useRef<CapturePoint[]>([]);
  const strokeId = useRef(0);
  const sessionStart = useRef(0);
  const sessionTimestamp = useRef(0);

  /** Reset state and begin a new capture session */
  const startSession = useCallback(() => {
    setStrokes([]);
    strokeId.current = 0;
    sessionStart.current = performance.now();
    sessionTimestamp.current = Date.now();
  }, []);

  /** Begin capturing a new stroke */
  const beginStroke = useCallback(() => {
    setIsDrawing(true);
    currentPoints.current = [];
  }, []);

  /** Append a point to the current stroke */
  const addPoint = useCallback((point: CapturePoint) => {
    currentPoints.current.push(point);
  }, []);

  /** Finalise the current stroke and compute its metrics */
  const endStroke = useCallback(() => {
    setIsDrawing(false);
    const points = [...currentPoints.current];
    currentPoints.current = [];
    if (points.length < 2) return;

    const metrics = computeStrokeMetrics(points);
    const stroke: Stroke = {
      id: strokeId.current++,
      points,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      metrics,
    };
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  /** Remove the last stroke */
  const undo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  /** Remove all strokes */
  const clear = useCallback(() => {
    setStrokes([]);
  }, []);

  /** Build the final CaptchaSession object (call on submit) */
  const buildSession = useCallback(
    (
      prompt: string,
      canvasWidth: number,
      canvasHeight: number,
    ): CaptchaSession => {
      const endTime = performance.now();
      const startTime = sessionStart.current;

      // Gaps between consecutive strokes
      const pauses: number[] = [];
      for (let i = 1; i < strokes.length; i++) {
        pauses.push(strokes[i].startTime - strokes[i - 1].endTime);
      }

      const totalPathLength = strokes.reduce(
        (sum, s) => sum + s.metrics.length,
        0,
      );
      const velocities = strokes.map((s) => s.metrics.avgVelocity);
      const avgVelocity =
        velocities.length > 0
          ? velocities.reduce((a, b) => a + b, 0) / velocities.length
          : 0;

      return {
        sessionId: crypto.randomUUID(),
        prompt,
        strokes,
        startTime,
        endTime,
        startTimestamp: sessionTimestamp.current,
        canvasWidth,
        canvasHeight,
        totalDuration: endTime - startTime,
        strokeCount: strokes.length,
        pausesBetweenStrokes: pauses,
        totalPathLength,
        avgVelocity,
      };
    },
    [strokes],
  );

  return {
    strokes,
    isDrawing,
    startSession,
    beginStroke,
    addPoint,
    endStroke,
    undo,
    clear,
    buildSession,
  } as const;
}
