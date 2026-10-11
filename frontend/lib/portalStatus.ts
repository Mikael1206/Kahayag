export const PORTAL_STATUSES = [
  "reported",
  "under_inspection",
  "work_order_issued",
  "resolved",
] as const;

export type PortalStatus = (typeof PORTAL_STATUSES)[number];

export const PORTAL_STATUS_LABEL: Record<PortalStatus, string> = {
  reported: "Open",
  under_inspection: "Under Inspection / Assigned to Tanod",
  work_order_issued: "Work Order Issued",
  resolved: "Resolved / Repaired",
};

export function isPortalStatus(value: string): value is PortalStatus {
  return (PORTAL_STATUSES as readonly string[]).includes(value);
}

export function nextPortalStatus(current: PortalStatus): PortalStatus | null {
  const index = PORTAL_STATUSES.indexOf(current);
  if (index < 0 || index >= PORTAL_STATUSES.length - 1) return null;
  return PORTAL_STATUSES[index + 1];
}

export function officialOwnsReport(
  officialBarangayId: string,
  reportBarangayId: string | null
): boolean {
  return reportBarangayId === null || reportBarangayId === officialBarangayId;
}

export type CorridorRow = {
  key: string;
  count: number;
  latestAt: string;
  lat: number;
  lng: number;
};

export function rankCorridors(
  reports: Array<{ lat: number; lng: number; createdAt: string }>
): CorridorRow[] {
  const buckets = new Map<string, CorridorRow>();
  for (const report of reports) {
    const lat = Math.round(report.lat * 1000) / 1000;
    const lng = Math.round(report.lng * 1000) / 1000;
    const key = `${lat},${lng}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        key,
        count: 1,
        latestAt: report.createdAt,
        lat,
        lng,
      });
      continue;
    }
    existing.count += 1;
    if (report.createdAt > existing.latestAt) existing.latestAt = report.createdAt;
  }
  return Array.from(buckets.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.latestAt < b.latestAt ? 1 : -1;
  });
}

export function reportsToCsv(
  reports: Array<{
    id: string;
    category: string;
    status: string;
    lat: number;
    lng: number;
    confirmCount: number;
    createdAt: string;
  }>
): string {
  const header = "id,category,status,lat,lng,confirm_count,created_at";
  const lines = reports.map((report) =>
    [
      report.id,
      report.category,
      report.status,
      report.lat,
      report.lng,
      report.confirmCount,
      report.createdAt,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}
