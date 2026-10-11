import { dbClient, type Official } from "./portalAuth";
import {
  isPortalStatus,
  nextPortalStatus,
  officialOwnsReport,
  rankCorridors,
  type PortalStatus,
} from "./portalStatus";
import { categoryLabel } from "./hazardTypes";

export type PortalReport = {
  id: string;
  lat: number;
  lng: number;
  category: string;
  categoryLabel: string;
  status: PortalStatus;
  confirmCount: number;
  barangayId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

function rowToReport(row: {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  status: string;
  confirm_count: number;
  barangay_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
}): PortalReport {
  const status = isPortalStatus(row.status) ? row.status : "reported";
  return {
    id: row.id,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    status,
    confirmCount: Number(row.confirm_count),
    barangayId: row.barangay_id,
    createdAt: new Date(row.created_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
  };
}

export async function listOfficialReports(official: Official) {
  const client = dbClient();
  await client.connect();
  try {
    const result = await client.query({
      text: `select id, latitude, longitude, category::text as category, status::text as status,
                    confirm_count, barangay_id, created_at, resolved_at
               from public.hazard_reports
              where barangay_id is null or barangay_id = $1
              order by case when status = 'resolved' then 1 else 0 end, created_at desc
              limit 200`,
      values: [official.barangayId],
    });
    const reports = result.rows.map(rowToReport);
    const open = reports.filter((report) => report.status !== "resolved");
    const resolved = await client.query<{ n: number }>(
      `select count(*)::int as n
         from public.hazard_reports
        where status = 'resolved'
          and barangay_id = $1`,
      [official.barangayId]
    );
    return {
      official,
      reports,
      corridors: rankCorridors(open),
      resolvedCount: Number(resolved.rows[0]?.n ?? 0),
    };
  } finally {
    await client.end();
  }
}

export async function advanceOfficialReport(
  official: Official,
  reportId: string,
  requested: string
): Promise<PortalReport> {
  if (!isPortalStatus(requested)) {
    throw new Error("INVALID_STATUS");
  }
  const client = dbClient();
  await client.connect();
  try {
    const current = await client.query({
      text: `select id, latitude, longitude, category::text as category, status::text as status,
                    confirm_count, barangay_id, created_at, resolved_at
               from public.hazard_reports
              where id = $1`,
      values: [reportId],
    });
    const row = current.rows[0];
    if (!row) {
      throw new Error("NOT_FOUND");
    }
    const report = rowToReport(row);
    if (!officialOwnsReport(official.barangayId, report.barangayId)) {
      throw new Error("FORBIDDEN");
    }
    const expected = nextPortalStatus(report.status);
    if (!expected || expected !== requested) {
      throw new Error("INVALID_STATUS");
    }
    const updated = await client.query({
      text: `update public.hazard_reports
                set status = $2,
                    barangay_id = coalesce(barangay_id, $3),
                    resolved_at = case when $2 = 'resolved' then now() else resolved_at end
              where id = $1
          returning id, latitude, longitude, category::text as category, status::text as status,
                    confirm_count, barangay_id, created_at, resolved_at`,
      values: [reportId, requested, official.barangayId],
    });
    return rowToReport(updated.rows[0]);
  } finally {
    await client.end();
  }
}
