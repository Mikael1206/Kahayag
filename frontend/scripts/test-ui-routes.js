const fs = require("fs");
const path = require("path");

function loadRouteFormat() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "lib", "routeFormat.ts"),
    "utf8"
  );
  const body = source
    .replace(/export /g, "")
    .replace(/:\s*(number|string)/g, "");
  return new Function(
    `${body}; return { minutesLabel, distanceLabel, durationDeltaLabel, lightingLabel };`
  )();
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function main() {
  const format = loadRouteFormat();

  assert(format.minutesLabel(90) === "2 min", "minutesLabel(90) should round to 2 min");
  assert(format.minutesLabel(10) === "1 min", "minutesLabel should never show 0 min");
  assert(format.distanceLabel(975) === "975 m", "distanceLabel should keep meters under 1 km");
  assert(format.distanceLabel(1500) === "1.5 km", "distanceLabel should use km at 1 km+");
  assert(
    format.durationDeltaLabel(720, 600) === "+2 min vs the direct route",
    "durationDeltaLabel should show extra minutes"
  );
  assert(
    format.durationDeltaLabel(600, 600) === "Same walking time as the direct route",
    "durationDeltaLabel should handle a tie"
  );
  assert(
    format.lightingLabel(85).includes("85%"),
    "lightingLabel should include the API percentage"
  );
  assert(
    !format.lightingLabel(100).toLowerCase().includes("100% safe"),
    "lightingLabel must never say 100% Safe"
  );

  const roots = [
    path.join(__dirname, "..", "app"),
    path.join(__dirname, "..", "lib"),
  ];
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  }
  roots.forEach(walk);

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert(
      !text.toLowerCase().includes("100% safe"),
      `${path.relative(path.join(__dirname, ".."), file)} contains forbidden copy`
    );
  }

  const card = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "RouteComparisonCard.tsx"),
    "utf8"
  );
  assert(card.includes("Verified Well-Lit Route"), "card must use Verified Well-Lit Route");
  assert(card.includes("Start walk"), "card must include Start walk");

  const experience = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "MapExperience.tsx"),
    "utf8"
  );
  assert(experience.includes("Calculating walking routes"), "missing loading state");
  assert(experience.includes("Enter origin and destination"), "missing empty state");
  assert(experience.includes("role=\"alert\""), "missing calculate error state");
  assert(experience.includes("/api/routes/calculate"), "UI must call the calculate API");

  const layers = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "RouteLayers.tsx"),
    "utf8"
  );
  assert(layers.includes("fitBounds"), "Start walk must fit the selected polyline");
  assert(layers.includes("#10B981"), "well-lit polyline color missing");
  assert(layers.includes("#64748B"), "direct polyline color missing");

  console.log("test-ui-routes: formatters, copy, empty/loading/error, and polyline wiring ok");
}

main();
