const fs = require("fs");
const path = require("path");
const dns = require("dns");
const ts = require("typescript");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

function loadPortalStatus() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "lib", "portalStatus.ts"),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
  });
  const module = { exports: {} };
  const fn = new Function("exports", "require", "module", outputText);
  fn(module.exports, () => ({}), module);
  return module.exports;
}

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

async function main() {
  const portal = loadPortalStatus();
  assert(portal.nextPortalStatus("reported") === "under_inspection", "open should advance to inspection");
  assert(
    portal.nextPortalStatus("work_order_issued") === "resolved",
    "work order should advance to resolved"
  );
  assert(portal.nextPortalStatus("resolved") === null, "resolved has no next step");
  assert(portal.officialOwnsReport("brgy-a", null) === true, "unassigned pins are claimable");
  assert(portal.officialOwnsReport("brgy-a", "brgy-a") === true, "matching barangay is owned");
  assert(portal.officialOwnsReport("brgy-a", "brgy-b") === false, "other barangay is forbidden");

  const ranked = portal.rankCorridors([
    { lat: 14.5862, lng: 121.0565, createdAt: "2026-09-01T00:00:00Z" },
    { lat: 14.58621, lng: 121.05652, createdAt: "2026-09-02T00:00:00Z" },
    { lat: 14.6, lng: 121.07, createdAt: "2026-09-03T00:00:00Z" },
  ]);
  assert(ranked[0].count === 2, "nearby pins should rank as one corridor");

  const csv = portal.reportsToCsv([
    {
      id: "1",
      category: "busted_light",
      status: "reported",
      lat: 1,
      lng: 2,
      confirmCount: 3,
      createdAt: "2026-09-01T00:00:00Z",
    },
  ]);
  assert(csv.includes("id,category,status"), "CSV header missing");

  const auth = fs.readFileSync(path.join(__dirname, "..", "lib", "portalAuth.ts"), "utf8");
  assert(auth.includes("signInWithPassword"), "login must use Supabase password auth");
  assert(auth.includes("getUser"), "session must verify the user with getUser");
  assert(!auth.includes("SERVICE_ROLE"), "service role must not appear in portal auth");

  const page = fs.readFileSync(path.join(__dirname, "..", "app", "portal", "page.tsx"), "utf8");
  assert(page.includes("Download CSV"), "CSV control missing");
  assert(page.includes("Print / Save as PDF"), "print control missing");

  loadEnvFiles();
  if (process.env.DATABASE_URL) {
    const sql = fs.readFileSync(
      path.join(__dirname, "..", "..", "backend", "sql", "002_barangay_portal.sql"),
      "utf8"
    );
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      await client.query(sql);
      const table = await client.query(
        `select 1 from information_schema.tables
          where table_schema = 'public' and table_name = 'barangay_users'`
      );
      assert(table.rowCount === 1, "barangay_users table missing after SQL apply");
      const rls = await client.query(
        `select relrowsecurity from pg_class
          where relname = 'barangay_users'`
      );
      assert(rls.rows[0].relrowsecurity === true, "barangay_users must have RLS");
    } finally {
      await client.end();
    }
    console.log("test-portal: status machine, ownership, CSV, and barangay_users RLS ok");
  } else {
    console.log("test-portal: status machine, ownership, and CSV ok (no DATABASE_URL)");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
