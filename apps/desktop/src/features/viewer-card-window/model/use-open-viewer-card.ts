import { useCallback } from "react";
import {
  createViewerCardWindowUrl,
  openViewerCardWindow,
  type OpenViewerCardWindowOptions,
} from "./open-viewer-card-window";

export function useOpenViewerCard() {
  return useCallback((options: OpenViewerCardWindowOptions) => {
    void openViewerCardWindow(options).catch((error: unknown) => {
      console.warn(
        "[desktop] 関係性カードの別ウィンドウを開けませんでした。同じウィンドウで表示します。",
        error,
      );
      window.location.hash = createViewerCardWindowUrl(options.userId, options);
    });
  }, []);
}
