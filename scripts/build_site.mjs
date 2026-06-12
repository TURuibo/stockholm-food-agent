// Build the published map site at docs/index.html (served by GitHub Pages).
// Renders the full places list plus your visit history (✓ Visited badge, ratings, comments)
// joined in by render_map.mjs. NOTE: this site is PUBLIC, so embedded comments are world-readable.
import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// render the full map -> map/view.html
const r = spawnSync(process.execPath, [join(here, "render_map.mjs"), "--title", "Stockholm Food Map — Michelin-adjacent value"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status || 1);

await mkdir(join(root, "docs"), { recursive: true });
await copyFile(join(root, "map", "view.html"), join(root, "docs", "index.html"));
console.log("Built docs/index.html for GitHub Pages.");
