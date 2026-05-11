import Database from "@tauri-apps/plugin-sql";

/** `src-tauri/src/lib.rs` の `DB_URL` と `tauri.conf.json` の preload と一致させること。 */
export const DB_URL = "sqlite:comment-dock.db" as const;

let loadPromise: Promise<Database> | null = null;

/**
 * アプリ用 SQLite ファイルの共有 `Database` を返す。
 * 複数箇所から呼んでもよく、内部の `load` は初回のみ実行される。
 */
export function getDatabase(): Promise<Database> {
  loadPromise ??= Database.load(DB_URL);
  return loadPromise;
}
