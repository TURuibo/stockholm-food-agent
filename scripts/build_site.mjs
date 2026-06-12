// Build the published GitHub Pages site under docs/:
//   docs/index.html  — the phone-first "This weekend" board (the landing page), built by
//                       build_weekend.mjs and regenerated daily by the daily-weekend workflow.
//   docs/map.html    — the full interactive map (all places + your visit history), from render_map.mjs.
// NOTE: this site is PUBLIC, so embedded comments/visits are world-readable.
import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function run(script, args = []) {
  const r = spawnSync(process.execPath, [join(here, script), ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

await mkdir(join(root, "docs"), { recursive: true });

// 1) full map -> map/view.html -> docs/map.html
run("render_map.mjs", ["--title", "Stockholm Food Map — Michelin-adjacent value"]);
await copyFile(join(root, "map", "view.html"), join(root, "docs", "map.html"));

// 2) weekend board -> docs/index.html (the landing page; links to map.html)
run("build_weekend.mjs");

console.log("Built docs/index.html (this-weekend board) + docs/map.html (full map) for GitHub Pages.");
