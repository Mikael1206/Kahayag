const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing backend/.env.local (copy backend/.env.example).");
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  loadEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    fail("DATABASE_URL is not set in backend/.env.local.");
  }

  const admin = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await admin.connect();

  try {
    const ext = await admin.query(
      "select extname from pg_extension where extname = $1",
      ["postgis"]
    );
    if (ext.rowCount !== 1) fail("PostGIS extension is not enabled.");

    const gist = await admin.query(
      `select 1
         from pg_indexes
        where schemaname = $1
          and tablename = $2
          and indexdef ilike $3`,
      ["public", "hazard_reports", "%gist%"]
    );
    if (gist.rowCount < 1) fail("hazard_reports has no GIST index.");

    const cols = await admin.query(
      `select column_name
         from information_schema.columns
        where table_schema = $1 and table_name = $2`,
      ["public", "hazard_reports"]
    );
    const names = cols.rows.map((row) => row.column_name);
    for (const forbidden of ["name", "email", "phone", "user_id"]) {
      if (names.includes(forbidden)) {
        fail(`INV-002: unexpected PII column ${forbidden}.`);
      }
    }

    const inserted = await admin.query(
      `insert into public.hazard_reports (latitude, longitude, category)
       values ($1, $2, $3)
       returning id, st_srid(geom) as srid`,
      [14.5862, 121.0565, "busted_light"]
    );
    const id = inserted.rows[0].id;
    if (inserted.rows[0].srid !== 4326) fail("geom SRID is not 4326.");

    const rls = await admin.query(
      `select relrowsecurity
         from pg_class
        where relname = $1`,
      ["hazard_reports"]
    );
    if (!rls.rows[0]?.relrowsecurity) fail("RLS is not enabled on hazard_reports.");

    await admin.query("delete from public.hazard_reports where id = $1", [id]);
    console.log("test-db: PostGIS, GIST, schema, and RLS flag OK");
  } finally {
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
