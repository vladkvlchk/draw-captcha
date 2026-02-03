/** A single captured point during drawing */
export interface CapturePoint {
  /** X coordinate in logical canvas space (0 - CANVAS_W) */
  x: number;
  /** Y coordinate in logical canvas space (0 - CANVAS_H) */
  y: number;
  /** High-resolution timestamp via performance.now() */
  timestamp: number;
  /** Pointer pressure 0-1 (defaults to 0.5 for mouse) */
  pressure: number;
  /** Input device type */
  pointerType: "mouse" | "touch" | "pen";
}

/** Computed metrics for a single stroke */
export interface StrokeMetrics {
  /** Total path length in pixels */
  length: number;
  /** Duration in milliseconds */
  duration: number;
  /** Average velocity in px/ms */
  avgVelocity: number;
  /** Peak velocity in px/ms */
  maxVelocity: number;
  /** Average acceleration in px/ms^2 */
  avgAcceleration: number;
  /** Peak acceleration in px/ms^2 */
  maxAcceleration: number;
  /** Number of significant direction changes */
  directionChanges: number;
}

/** A single drawing stroke (pointer-down to pointer-up) */
export interface Stroke {
  id: number;
  points: CapturePoint[];
  startTime: number;
  endTime: number;
  metrics: StrokeMetrics;
}

/** Full session data for one CAPTCHA interaction */
export interface CaptchaSession {
  sessionId: string;
  prompt: string;
  strokes: Stroke[];
  /** Relative start time (performance.now) */
  startTime: number;
  /** Relative end time (performance.now) */
  endTime: number;
  /** Absolute wall-clock start (Date.now) */
  startTimestamp: number;
  canvasWidth: number;
  canvasHeight: number;
  totalDuration: number;
  strokeCount: number;
  /** Gaps between consecutive strokes in ms */
  pausesBetweenStrokes: number[];
  totalPathLength: number;
  avgVelocity: number;
}

/** Result returned by a scoring algorithm */
export interface ScoringResult {
  /** Risk score: 0 (no risk) to 1 (highest risk), -1 = error */
  score: number;
  /** Confidence in the score: 0 to 1 */
  confidence: number;
  /** Named signal values for debugging */
  signals: Record<string, number>;
  details?: string;
}

/** Interface every pluggable scoring algorithm must implement */
export interface ScoringAlgorithm {
  name: string;
  version: string;
  score: (session: CaptchaSession) => ScoringResult;
}

/** Challenge prompt configuration */
export interface ChallengePrompt {
  instruction: string;
  emoji: string;
  category: "symbol" | "number" | "shape";
}
