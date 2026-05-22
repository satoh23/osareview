import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const VIEWER_CARD_WINDOW_LABEL = "viewer-card";

export type OpenViewerCardWindowOptions = {
  userId: string;
  displayName?: string;
};

type NavigableWebviewWindow = WebviewWindow & {
  navigate?: (url: string) => Promise<void>;
};

export async function openViewerCardWindow({
  displayName,
  userId,
}: OpenViewerCardWindowOptions): Promise<WebviewWindow> {
  const url = createViewerCardWindowUrl(userId);
  const existingWindow = await WebviewWindow.getByLabel(
    VIEWER_CARD_WINDOW_LABEL,
  );

  if (existingWindow) {
    await navigateViewerCardWindow(existingWindow, url);
    await existingWindow.setFocus();
    return existingWindow;
  }

  const viewerCardWindow = new WebviewWindow(VIEWER_CARD_WINDOW_LABEL, {
    url,
    title: createViewerCardWindowTitle(displayName),
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    alwaysOnTop: true,
    decorations: true,
    visible: true,
  });

  await viewerCardWindow.setFocus();
  return viewerCardWindow;
}

export function createViewerCardWindowUrl(userId: string): string {
  return `#/viewer-card/${encodeURIComponent(userId)}`;
}

const createViewerCardWindowTitle = (displayName?: string): string => {
  if (!displayName) {
    return "関係性カード";
  }
  return `${displayName} - 関係性カード`;
};

const navigateViewerCardWindow = async (
  window: WebviewWindow,
  url: string,
): Promise<void> => {
  const navigableWindow = window as NavigableWebviewWindow;
  await navigableWindow.navigate?.(url);
};
