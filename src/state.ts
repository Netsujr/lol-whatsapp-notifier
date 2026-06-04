import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppState } from "./types.js";

const STATE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "state.json",
);

const DEFAULT_STATE: AppState = { lastMatchId: "" };

export async function readState(): Promise<AppState> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AppState;
    return {
      lastMatchId: typeof parsed.lastMatchId === "string" ? parsed.lastMatchId : "",
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function writeState(state: AppState): Promise<void> {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}
