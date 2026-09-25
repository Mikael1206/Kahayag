import dns from "dns";
import { Client } from "pg";

dns.setDefaultResultOrder("ipv4first");

export type LatLng = { lat: number; lng: number };

export type RouteOption = {
  distanceMeters: number;
  durationSeconds: number;
  hazardCount: number;
  lightingCoveragePct: number;
  geometry: { type: "LineString"; coordinates: number[][] };
};

export type CalculateResult = {
  wellLit: RouteOption;
  direct: RouteOption;
  warning?: string;
};

const OSRM_FOOT = "https://router.project-osrm.org/route/v1/foot";

export function lightingCoveragePct(hazardCount: number): number {
  return Math.max(0, 100 - hazardCount * 15);
}

export function isValidLatLng(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

async function countHazardsNearLine(
  client: Client,
  coordinates: number[][]
): Promise<number> {
  const geojson = JSON.stringify({ type: "LineString", coordinates });
  const result = await client.query<{ n: number }>(
    `select count(*)::int as n
       from public.hazard_reports
      where status <> 'resolved'
        and st_dwithin(
          geom::geography,
          st_setsrid(st_geomfromgeojson($1), 4326)::geography,
          30
        )`,
    [geojson]
  );
  return Number(result.rows[0]?.n ?? 0);
}

export async function calculateRoutes(
  origin: LatLng,
  destination: LatLng,
  accuracyMeters?: number
): Promise<CalculateResult> {
  const url =
    `${OSRM_FOOT}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    "?alternatives=true&geometries=geojson&overview=full";

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`OSRM_UNAVAILABLE:${response.status}`);
  }

  const payload = (await response.json()) as {
    code?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { type: string; coordinates: number[][] };
    }>;
  };

  if (payload.code !== "Ok" || !payload.routes?.length) {
    throw new Error("OSRM_NO_ROUTE");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL_MISSING");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const scored: RouteOption[] = [];
    for (const route of payload.routes.slice(0, 3)) {
      const coordinates = route.geometry.coordinates;
      const hazardCount = await countHazardsNearLine(client, coordinates);
      scored.push({
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        hazardCount,
        lightingCoveragePct: lightingCoveragePct(hazardCount),
        geometry: { type: "LineString", coordinates },
      });
    }

    const direct = [...scored].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    const wellLit = [...scored].sort((a, b) => {
      const aCost = a.distanceMeters * (1 + a.hazardCount * 0.15);
      const bCost = b.distanceMeters * (1 + b.hazardCount * 0.15);
      return aCost - bCost;
    })[0];

    const result: CalculateResult = { wellLit, direct };
    if (typeof accuracyMeters === "number" && accuracyMeters > 50) {
      result.warning = "GPS accuracy is worse than 50 meters. Verify your start point.";
    }
    return result;
  } finally {
    await client.end();
  }
}
