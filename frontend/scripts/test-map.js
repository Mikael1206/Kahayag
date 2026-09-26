const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function loadMapStyle() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "lib", "mapStyle.ts"),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const fn = new Function("exports", "require", "module", outputText);
  fn(module.exports, () => ({}), module);
  return module.exports;
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function main() {
  const map = loadMapStyle();

  const evening = new Date();
  evening.setHours(19, 0, 0, 0);
  const dawn = new Date();
  dawn.setHours(5, 0, 0, 0);
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  assert(map.isNightHours(evening) === true, "19:00 should be night");
  assert(map.isNightHours(dawn) === true, "05:00 should be night");
  assert(map.isNightHours(noon) === false, "noon should be day");

  const now = Date.parse("2026-09-26T12:00:00Z");
  assert(
    map.reportedAgo(new Date(now - 2 * 3600000).toISOString(), now) ===
      "Reported 2 hours ago",
    "relative time should match PRD example shape"
  );

  const pins = [
    {
      id: "a",
      lat: 14.586,
      lng: 121.056,
      category: "busted_light",
      status: "reported",
      confirmCount: 1,
      createdAt: "2026-09-26T00:00:00Z",
    },
    {
      id: "b",
      lat: 14.5861,
      lng: 121.0561,
      category: "hazard",
      status: "reported",
      confirmCount: 2,
      createdAt: "2026-09-26T00:00:00Z",
    },
    {
      id: "c",
      lat: 14.6,
      lng: 121.07,
      category: "unlit_street",
      status: "reported",
      confirmCount: 1,
      createdAt: "2026-09-26T00:00:00Z",
    },
  ];
  const clustered = map.clusterHazards(pins, 13);
  assert(
    clustered.some((group) => group.count >= 2),
    "neighborhood zoom should merge nearby pins"
  );
  const exploded = map.clusterHazards(pins, map.CLUSTER_ZOOM);
  assert(exploded.length === 3, "street zoom should show individual pins");

  const coords = [
    [121.0565, 14.5862],
    [121.0565, 14.58625],
    [121.07, 14.6],
  ];
  const well = map.colorRouteSegments(
    coords,
    [{ lat: 14.58622, lng: 121.0565 }],
    "wellLit"
  );
  assert(
    well.some((segment) => segment.color === map.ROUTE_COLORS.nearHazard),
    "segments near a pin should be red"
  );
  assert(
    well.some((segment) => segment.color === map.ROUTE_COLORS.wellLit),
    "clear well-lit segments should stay green"
  );
  const direct = map.colorRouteSegments(
    [
      [121.07, 14.6],
      [121.071, 14.601],
    ],
    [],
    "direct"
  );
  assert(
    direct[0].color === map.ROUTE_COLORS.unconfirmed,
    "clear direct segments should be yellow"
  );
  assert(direct[0].dashed === true, "direct segments stay dashed");

  const nightMap = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "NightMap.tsx"),
    "utf8"
  );
  assert(nightMap.includes("leaflet-osm-fallback"), "night tile class missing");
  assert(nightMap.includes("isNightHours"), "night hours gate missing");

  const pinsFile = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "HazardPins.tsx"),
    "utf8"
  );
  assert(pinsFile.includes("clusterHazards"), "pin clustering missing");
  assert(pinsFile.includes("reportedAgo"), "relative report time missing");

  console.log("test-map: night hours, segment colors, and clustering ok");
}

main();
