import Database from "@tauri-apps/plugin-sql";

/** Must match `DB_URL` in `src-tauri/src/lib.rs` and `tauri.conf.json` preload. */
export const DB_URL = "sqlite:comment-dock.db" as const;

let loadPromise: Promise<Database> | null = null;

/**
 * Returns a shared `Database` instance for the app SQLite file.
 * Safe to call from multiple places; the underlying `load` runs once.
 */
export function getDatabase(): Promise<Database> {
  loadPromise ??= Database.load(DB_URL);
  return loadPromise;
}
