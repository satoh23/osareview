import { useCallback } from "react";
import {
  openViewerCardWindow,
  type OpenViewerCardWindowOptions,
} from "./open-viewer-card-window";

export function useOpenViewerCard() {
  return useCallback((options: OpenViewerCardWindowOptions) => {
    void openViewerCardWindow(options);
  }, []);
}
