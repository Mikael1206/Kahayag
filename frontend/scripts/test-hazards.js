const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

const MARKER = "kahayag-task-005";
const CATEGORY = "busted_light";
const OTHER = "hazard";
const BASE = { lat: 14.4, lng: 121.0 };
const NEAR = { lat: 14.40008, lng: 121.0 };
const FAR = { lat: 14.401, lng: 121.0 };

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

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

async function findNearby(client, point, category) {
  const result = await client.query(
    `select id, confirm_count, category, status
       from public.hazard_reports
      where status <> 'resolved'
        and category = $1
        and st_dwithin(
          geom::geography,
          st_setsrid(st_makepoint($2, $3), 4326)::geography,
          25
        )
      order by st_distance(
        geom::geography,
        st_setsrid(st_makepoint($2, $3), 4326)::geography
      )
      limit 1`,
    [category, point.lng, point.lat]
  );
  return result.rows[0] || null;
}

function mainCopyChecks() {
  const reporter = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "HazardReporter.tsx"),
    "utf8"
  );
  assert(reporter.includes("Confirm Existing Report (+1)"), "missing confirm copy");
  assert(reporter.includes("Report dark spot"), "missing report title");
  const route = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "hazards", "route.ts"),
    "utf8"
  );
  assert(route.includes("confirmHazard"), "POST must confirm existing pins");
  assert(route.includes("createHazard"), "POST must create new pins");
}

async function main() {
  mainCopyChecks();
  loadEnvFiles();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing (checked frontend/.env.local and backend/.env.local).");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query("delete from public.hazard_reports where description = $1", [MARKER]);

    const inserted = await client.query(
      `insert into public.hazard_reports (latitude, longitude, category, description)
       values ($1, $2, $3, $4)
       returning id, confirm_count`,
      [BASE.lat, BASE.lng, CATEGORY, MARKER]
    );
    const id = inserted.rows[0].id;
    assert(Number(inserted.rows[0].confirm_count) === 1, "new pin confirm_count should be 1");

    const nearHit = await findNearby(client, NEAR, CATEGORY);
    assert(nearHit && nearHit.id === id, "same category within 25 m should match");

    const farMiss = await findNearby(client, FAR, CATEGORY);
    assert(!farMiss, "pin farther than 25 m should not match");

    const otherMiss = await findNearby(client, NEAR, OTHER);
    assert(!otherMiss, "different category within 25 m should not match");

    await client.query(
      `insert into public.hazard_reports (latitude, longitude, category, description, status)
       values ($1, $2, $3, $4, 'resolved')`,
      [NEAR.lat, NEAR.lng, OTHER, MARKER]
    );
    const resolvedIgnored = await findNearby(client, NEAR, OTHER);
    assert(!resolvedIgnored, "resolved pins must not be offered for confirm");

    const confirmed = await client.query(
      `update public.hazard_reports
          set confirm_count = confirm_count + 1
        where id = $1
      returning confirm_count`,
      [id]
    );
    assert(Number(confirmed.rows[0].confirm_count) === 2, "confirm should increment count");

    await client.query("delete from public.hazard_reports where description = $1", [MARKER]);
    console.log("test-hazards: 25 m same-category dedup and confirm_count ok");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
