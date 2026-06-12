// PostToolUse hook (Write|Edit): if a core data file was just changed, validate it parses.
// Advisory only — never blocks. Reads the hook payload JSON from stdin.
import { readFile } from "node:fs/promises";

let raw = "";
for await (const c of process.stdin) raw += c;
let fp = "";
try { fp = JSON.parse(raw)?.tool_input?.file_path || ""; } catch { process.exit(0); }

const norm = fp.replace(/\\/g, "/");
try {
  if (norm.endsWith("data/places.json") || norm.endsWith("data/config.json")) {
    JSON.parse(await readFile(fp, "utf8"));
    console.log(`✓ ${norm.split("/").pop()} is valid JSON`);
  }
} catch (e) {
  console.log(`⚠️  ${norm.split("/").pop()} is NOT valid JSON: ${e.message} — fix before relying on it.`);
}
process.exit(0);
