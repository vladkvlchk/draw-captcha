import type { CapturePoint, StrokeMetrics } from "./types";

/** Euclidean distance between two captured points */
function distance(a: CapturePoint, b: CapturePoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Angle (radians) from point a to point b */
function angle(a: CapturePoint, b: CapturePoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Compute behavioral metrics for a set of stroke points.
 *
 * All velocities are in px/ms and accelerations in px/ms^2.
 * Direction changes use a ~30-degree threshold.
 */
export function computeStrokeMetrics(points: CapturePoint[]): StrokeMetrics {
  if (points.length < 2) {
    return {
      length: 0,
      duration: 0,
      avgVelocity: 0,
      maxVelocity: 0,
      avgAcceleration: 0,
      maxAcceleration: 0,
      directionChanges: 0,
    };
  }

  let totalLength = 0;
  const velocities: number[] = [];
  const accelerations: number[] = [];
  let directionChanges = 0;
  let prevAngle: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const dist = distance(points[i - 1], points[i]);
    const dt = points[i].timestamp - points[i - 1].timestamp;

    totalLength += dist;

    if (dt > 0) {
      const velocity = dist / dt;
      velocities.push(velocity);

      if (velocities.length > 1) {
        const dv = Math.abs(velocity - velocities[velocities.length - 2]);
        accelerations.push(dv / dt);
      }
    }

    // Detect direction changes (threshold ≈ 30 degrees)
    const currentAngle = angle(points[i - 1], points[i]);
    if (prevAngle !== null) {
      let angleDiff = Math.abs(currentAngle - prevAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > Math.PI / 6) directionChanges++;
    }
    prevAngle = currentAngle;
  }

  const duration = points[points.length - 1].timestamp - points[0].timestamp;

  const avgVelocity =
    velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;
  const maxVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;

  const avgAcceleration =
    accelerations.length > 0
      ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length
      : 0;
  const maxAcceleration =
    accelerations.length > 0 ? Math.max(...accelerations) : 0;

  return {
    length: totalLength,
    duration,
    avgVelocity,
    maxVelocity,
    avgAcceleration,
    maxAcceleration,
    directionChanges,
  };
}
