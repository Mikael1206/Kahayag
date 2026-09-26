const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function loadSos() {
  const source = fs.readFileSync(path.join(__dirname, "..", "lib", "sos.ts"), "utf8");
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

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function main() {
  const sos = loadSos();
  assert(sos.SOS_HOLD_MS === 1500, "hold must be 1.5 seconds");
  assert(sos.SOS_CANCEL_MS === 2000, "cancel slide must be 2 seconds");

  const body = sos.sosSmsBody(14.5862, 121.0565);
  assert(body.includes("Kahayag SOS"), "SMS body must identify Kahayag SOS");
  assert(
    body.includes("openstreetmap.org") && body.includes("14.5862"),
    "SMS body must include an OSM link with coordinates"
  );
  assert(sos.sosSmsHref(14.5862, 121.0565).startsWith("sms:?body="), "href must use sms: URI");
  assert(
    sos.sosSmsBody().includes("Location was not available"),
    "missing GPS must not invent coordinates"
  );

  const ui = fs.readFileSync(
    path.join(__dirname, "..", "app", "components", "SosControl.tsx"),
    "utf8"
  );
  assert(ui.includes("Send SMS Alert"), "SMS control missing");
  assert(ui.includes("Cancel Alert"), "cancel control missing");
  assert(!/911/.test(ui), "must not auto-dial 911");

  console.log("test-sos: hold timing, SMS OSM link, and no 911 auto-dial ok");
}

main();
