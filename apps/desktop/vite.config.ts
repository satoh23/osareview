import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** モバイル実機デバッグ時など、`TAURI_DEV_HOST` で HMR 先を指定する（未設定なら falsy）。 */
const host = process.env.TAURI_DEV_HOST;

// 公式: https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // `tauri dev` / `tauri build` 向けの Vite 設定
  //
  // 1. Rust 側のエラーが Vite の表示に隠れないようにする
  clearScreen: false,
  // 2. Tauri は固定ポート前提のため、使用中なら失敗させる
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. `src-tauri` をファイル監視から外す
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
}));
