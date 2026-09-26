import type { HazardPin } from "./hazardTypes";

export const HAZARD_SEGMENT_METERS = 30;
export const CLUSTER_ZOOM = 15;

export const ROUTE_COLORS = {
  wellLit: "#10B981",
  unconfirmed: "#EAB308",
  nearHazard: "#B91C1C",
} as const;

export function isNightHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

export function reportedAgo(createdAt: string, nowMs: number = Date.now()): string {
  const then = new Date(createdAt).getTime();
  if (!Number.isFinite(then)) return "Reported at an unknown time";
  const minutes = Math.max(0, Math.floor((nowMs - then) / 60000));
  if (minutes < 1) return "Reported just now";
  if (minutes === 1) return "Reported 1 minute ago";
  if (minutes < 60) return `Reported ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Reported 1 hour ago";
  if (hours < 24) return `Reported ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Reported 1 day ago";
  return `Reported ${days} days ago`;
}

export type HazardCluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  pins: HazardPin[];
};

export function clusterHazards(pins: HazardPin[], zoom: number): HazardCluster[] {
  if (zoom >= CLUSTER_ZOOM) {
    return pins.map((pin) => ({
      id: pin.id,
      lat: pin.lat,
      lng: pin.lng,
      count: 1,
      pins: [pin],
    }));
  }
  const cell = zoom <= 12 ? 0.02 : 0.008;
  const buckets = new Map<string, HazardPin[]>();
  for (const pin of pins) {
    const key = `${Math.floor(pin.lat / cell)},${Math.floor(pin.lng / cell)}`;
    const list = buckets.get(key) ?? [];
    list.push(pin);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries()).map(([key, group]) => {
    const lat = group.reduce((sum, pin) => sum + pin.lat, 0) / group.length;
    const lng = group.reduce((sum, pin) => sum + pin.lng, 0) / group.length;
    return { id: `cluster-${key}`, lat, lng, count: group.length, pins: group };
  });
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pointNearHazards(
  point: { lat: number; lng: number },
  hazards: Array<{ lat: number; lng: number }>,
  meters: number = HAZARD_SEGMENT_METERS
): boolean {
  return hazards.some((hazard) => haversineMeters(point, hazard) <= meters);
}

export type ColoredSegment = {
  positions: [number, number][];
  color: string;
  dashed: boolean;
};

export function colorRouteSegments(
  coordinates: number[][],
  hazards: Array<{ lat: number; lng: number }>,
  kind: "wellLit" | "direct"
): ColoredSegment[] {
  const safeColor = kind === "wellLit" ? ROUTE_COLORS.wellLit : ROUTE_COLORS.unconfirmed;
  const segments: ColoredSegment[] = [];
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const [lngA, latA] = coordinates[i];
    const [lngB, latB] = coordinates[i + 1];
    const mid = { lat: (latA + latB) / 2, lng: (lngA + lngB) / 2 };
    const near = pointNearHazards(mid, hazards);
    const color = near ? ROUTE_COLORS.nearHazard : safeColor;
    const dashed = near || kind === "direct";
    const last = segments[segments.length - 1];
    if (last && last.color === color && last.dashed === dashed) {
      last.positions.push([latB, lngB]);
    } else {
      segments.push({
        positions: [
          [latA, lngA],
          [latB, lngB],
        ],
        color,
        dashed,
      });
    }
  }
  return segments;
}
