/**
 * `performance.mark` / `performance.measure` の軽量ラッパー。
 * 本番でも mark 自体は有効（オーバーヘッドは無視できる程度）。
 * 開発時のみ console.debug で measure 結果を出力する。
 */

export function markPerf(name: string): void {
  if (typeof performance === "undefined") return;
  performance.mark(name);
}

export function measurePerf(
  name: string,
  startMark: string,
  endMark: string,
): void {
  if (typeof performance === "undefined") return;
  try {
    const measure = performance.measure(name, startMark, endMark);
    if (import.meta.env.DEV) {
      console.debug(
        `[perf] ${measure.name}: ${measure.duration.toFixed(1)} ms`,
      );
    }
  } catch {
    // mark が存在しない場合（テスト環境など）は無視する
  }
}
