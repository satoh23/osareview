import { invoke } from "@tauri-apps/api/core";

export const tauriCommands = {
  greet: (name: string) => invoke<string>("greet", { name }),
} as const;
