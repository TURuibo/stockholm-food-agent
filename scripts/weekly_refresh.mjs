// Deterministic weekly refresh entrypoint: re-scrape Michelin + re-derive fingerprint.
// The agentic "hunt for new gems" step needs WebSearch, so it runs via the /hunt command or the
// hunter subagent (e.g. from a scheduled Claude routine) — this script covers the data refresh.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const run = (f, args = []) => {
  console.log(`\n▶ ${f} ${args.join(" ")}`);
  const r = spawnSync(process.execPath, [join(here, f), ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exitCode = r.status || 1;
};

console.log("=== Weekly Michelin refresh ===");
run("michelin_scrape.mjs");
run("derive_fingerprint.mjs");
console.log("\n✓ Data refreshed. Run /hunt to discover new value gems, then /map to rebuild the map.");
