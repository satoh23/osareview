import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

const VIEWER_CARD_LABEL_PREFIX = "viewer-card-";

/**
 * 指定ラベルが viewer-card ウィンドウのものかを判定する純関数。
 */
export function isViewerCardWindowLabel(label: string): boolean {
  return label.startsWith(VIEWER_CARD_LABEL_PREFIX);
}

/**
 * 現在の Tauri WebviewWindow ラベルをモジュールロード時に一度だけ評価する。
 * React のレンダリングより前に確定させることで、初回描画からラベルを参照できる。
 * Tauri 環境外（テスト等）では空文字を返す。
 */
const WINDOW_LABEL = (() => {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    return "";
  }
})();

/**
 * 現在のウィンドウラベルを返す。
 * テスト容易性のため `getLabel` 引数で差し替え可能。
 */
export function useWindowLabel(getLabel?: () => string): string {
  return getLabel ? getLabel() : WINDOW_LABEL;
}
