export function minutesLabel(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

export function distanceLabel(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function durationDeltaLabel(
  wellLitSeconds: number,
  directSeconds: number
): string {
  const deltaMin = Math.round((wellLitSeconds - directSeconds) / 60);
  if (deltaMin === 0) return "Same walking time as the direct route";
  if (deltaMin > 0) return `+${deltaMin} min vs the direct route`;
  return `${deltaMin} min vs the direct route`;
}

export function lightingLabel(lightingCoveragePct: number): string {
  return `Lighting score ${lightingCoveragePct}% (from unresolved dark-spot pins on this path)`;
}
