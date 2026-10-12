import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_DIR = join(ROOT, "src", "data");

const read = (name) => JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));

/** The five 2026 rate files, in the shape the engine expects. */
export function loadTables() {
  return {
    federal: read("federal-2026.json"),
    fica: read("fica-2026.json"),
    states: read("states-2026.json"),
    local: read("local-2026.json"),
    payroll: read("state-payroll-2026.json"),
  };
}
