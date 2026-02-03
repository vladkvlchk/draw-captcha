"use client";

import { useState } from "react";
import type { CaptchaSession } from "./types";

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtSpeed(pxPerMs: number): string {
  return `${Math.round(pxPerMs * 1000)} px/s`;
}

interface MetricsPanelProps {
  session: CaptchaSession;
}

export function MetricsPanel({ session }: MetricsPanelProps) {
  const [showJson, setShowJson] = useState(false);

  const avgPressure =
    session.strokes.length > 0
      ? session.strokes.reduce(
          (sum, s) =>
            sum +
            s.points.reduce((ps, p) => ps + p.pressure, 0) / s.points.length,
          0,
        ) / session.strokes.length
      : 0;

  const totalDirChanges = session.strokes.reduce(
    (sum, s) => sum + s.metrics.directionChanges,
    0,
  );

  return (
    <div className="w-full space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        Session Metrics
      </h3>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Metric label="Strokes" value={String(session.strokeCount)} />
        <Metric label="Duration" value={fmtDuration(session.totalDuration)} />
        <Metric label="Avg Speed" value={fmtSpeed(session.avgVelocity)} />
        <Metric
          label="Path Length"
          value={`${Math.round(session.totalPathLength)} px`}
        />
        <Metric label="Avg Pressure" value={avgPressure.toFixed(2)} />
        <Metric label="Dir. Changes" value={String(totalDirChanges)} />
      </div>

      {/* Per-stroke breakdown */}
      {session.strokes.length > 0 && (
        <details className="group text-sm">
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300">
            Per-stroke breakdown
          </summary>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {session.strokes.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5 text-xs dark:bg-neutral-800/50"
              >
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Stroke {s.id + 1}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {s.points.length} pts &middot;{" "}
                  {fmtDuration(s.metrics.duration)} &middot;{" "}
                  {fmtSpeed(s.metrics.avgVelocity)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Raw JSON toggle */}
      <button
        onClick={() => setShowJson((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <span
          className={`inline-block transition-transform ${showJson ? "rotate-90" : ""}`}
        >
          &#9654;
        </span>
        {showJson ? "Hide" : "View"} captured data (JSON)
      </button>

      {showJson && (
        <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-100 p-3 font-mono text-[11px] leading-relaxed text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {JSON.stringify(session, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/50">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}
