/**
 * アプリ共通の上部ヘッダー帯（`HeaderBar`）のレイアウト。
 *
 * - **`heightClass`**: メインウィンドウ上端のヘッダー本体の縦サイズ。
 * - **`overlayTopInsetClass`**: 「ヘッダー以外を覆って外側クリックで閉じる」ようなオーバーレイを、ヘッダー直下から敷くときの inset-top。この値は `heightClass` と常にセットで合わせること（ヘッダーだけクリック可能にしたいときなど）。
 *
 * メインコンテンツの `h-[calc(100vh-4rem)]`（`apps/desktop/src/pages/home/ui/home-page.tsx`）も、変更時はヘッダーと同じ 4rem になるように揃えること。
 */

export const HEADER_BAR_VERTICAL_LAYOUT = {
  heightClass: "h-16",
  overlayTopInsetClass: "top-16",
} as const;

/**
 * プラットフォーム接続ポップオーバー（透明レイヤー＋パネル）と、その手前に載せたいコンテンツの重なり順。
 * 順序（backdrop < 前面コンテンツ < パネル）を崩さないこと。
 */
export const PLATFORM_CONNECTION_POPOVER_Z = {
  backdrop: "z-65",
  /** バックドロップより上・パネルより下（例: 未接続の YouTube/Twitch 案内カード。外周は pointer-events-none にして透過クリックで閉じる） */
  contentAboveBackdrop: "z-66",
  panel: "z-70",
} as const;
