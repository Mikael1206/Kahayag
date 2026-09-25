const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

const ORIGIN = { lat: 14.5862, lng: 121.0565 };
const DESTINATION = { lat: 14.589, lng: 121.059 };

function loadEnvFiles() {
  const files = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", "..", "backend", ".env.local"),
  ];
  for (const envPath of files) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function lightingCoveragePct(hazardCount) {
  return Math.max(0, 100 - hazardCount * 15);
}

async function main() {
  loadEnvFiles();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing (checked frontend/.env.local and backend/.env.local).");
    process.exit(1);
  }

  const osrm =
    `https://router.project-osrm.org/route/v1/foot/${ORIGIN.lng},${ORIGIN.lat};${DESTINATION.lng},${DESTINATION.lat}` +
    "?alternatives=true&geometries=geojson&overview=full";

  const osrmResponse = await fetch(osrm, { headers: { accept: "application/json" } });
  if (!osrmResponse.ok) {
    console.error("OSRM request failed:", osrmResponse.status);
    process.exit(1);
  }
  const payload = await osrmResponse.json();
  if (payload.code !== "Ok" || !payload.routes?.length) {
    console.error("OSRM returned no walking routes.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const scored = [];
    for (const route of payload.routes.slice(0, 3)) {
      const geojson = JSON.stringify({
        type: "LineString",
        coordinates: route.geometry.coordinates,
      });
      const counted = await client.query(
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
      const hazardCount = counted.rows[0].n;
      scored.push({
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        hazardCount,
        lightingCoveragePct: lightingCoveragePct(hazardCount),
      });
    }

    const direct = [...scored].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    const wellLit = [...scored].sort((a, b) => {
      const aCost = a.distanceMeters * (1 + a.hazardCount * 0.15);
      const bCost = b.distanceMeters * (1 + b.hazardCount * 0.15);
      return aCost - bCost;
    })[0];

    if (!direct || !wellLit) {
      console.error("Failed to pick well-lit and direct routes.");
      process.exit(1);
    }
    if (typeof wellLit.lightingCoveragePct !== "number") {
      console.error("lightingCoveragePct missing.");
      process.exit(1);
    }

    console.log(
      `test-routes: ${scored.length} OSRM candidate(s); wellLit ${wellLit.distanceMeters}m / ${wellLit.hazardCount} hazards; direct ${direct.distanceMeters}m`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
