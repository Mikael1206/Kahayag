import dns from "dns";
import { Client } from "pg";
import { isValidLatLng, type LatLng } from "./calculateRoute";
import {
  DEDUP_METERS,
  type HazardCategory,
  type HazardPin,
} from "./hazardTypes";

export {
  DEDUP_METERS,
  HAZARD_CATEGORIES,
  categoryLabel,
  isHazardCategory,
  type HazardCategory,
  type HazardPin,
} from "./hazardTypes";

dns.setDefaultResultOrder("ipv4first");

function dbClient(): Client {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL_MISSING");
  }
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

function rowToPin(row: {
  id: string;
  latitude: number;
  longitude: number;
  category: HazardCategory;
  status: string;
  confirm_count: number;
  created_at: Date;
}): HazardPin {
  return {
    id: row.id,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    category: row.category,
    status: row.status,
    confirmCount: Number(row.confirm_count),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function findNearbyHazard(
  point: LatLng,
  category: HazardCategory
): Promise<HazardPin | null> {
  if (!isValidLatLng(point)) {
    throw new Error("INVALID_POINT");
  }
  const client = dbClient();
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      latitude: number;
      longitude: number;
      category: HazardCategory;
      status: string;
      confirm_count: number;
      created_at: Date;
    }>(
      `select id, latitude, longitude, category, status, confirm_count, created_at
         from public.hazard_reports
        where status <> 'resolved'
          and category = $1
          and st_dwithin(
            geom::geography,
            st_setsrid(st_makepoint($2, $3), 4326)::geography,
            $4
          )
        order by st_distance(
          geom::geography,
          st_setsrid(st_makepoint($2, $3), 4326)::geography
        )
        limit 1`,
      [category, point.lng, point.lat, DEDUP_METERS]
    );
    const row = result.rows[0];
    return row ? rowToPin(row) : null;
  } finally {
    await client.end();
  }
}

export async function createHazard(
  point: LatLng,
  category: HazardCategory,
  description?: string
): Promise<{ pin: HazardPin; created: true } | { pin: HazardPin; created: false }> {
  const neighbor = await findNearbyHazard(point, category);
  if (neighbor) {
    return { pin: neighbor, created: false };
  }
  const client = dbClient();
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      latitude: number;
      longitude: number;
      category: HazardCategory;
      status: string;
      confirm_count: number;
      created_at: Date;
    }>(
      `insert into public.hazard_reports (latitude, longitude, category, description)
       values ($1, $2, $3, $4)
       returning id, latitude, longitude, category, status, confirm_count, created_at`,
      [point.lat, point.lng, category, description ?? null]
    );
    return { pin: rowToPin(result.rows[0]), created: true };
  } finally {
    await client.end();
  }
}

export async function confirmHazard(
  confirmId: string,
  point: LatLng,
  category: HazardCategory
): Promise<HazardPin> {
  const neighbor = await findNearbyHazard(point, category);
  if (!neighbor || neighbor.id !== confirmId) {
    throw new Error("CONFIRM_MISMATCH");
  }
  const client = dbClient();
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      latitude: number;
      longitude: number;
      category: HazardCategory;
      status: string;
      confirm_count: number;
      created_at: Date;
    }>(
      `update public.hazard_reports
          set confirm_count = confirm_count + 1
        where id = $1
          and status <> 'resolved'
          and category = $2
      returning id, latitude, longitude, category, status, confirm_count, created_at`,
      [confirmId, category]
    );
    if (!result.rows[0]) {
      throw new Error("CONFIRM_MISMATCH");
    }
    return rowToPin(result.rows[0]);
  } finally {
    await client.end();
  }
}
