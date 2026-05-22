import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { CommentSource } from "@comment-dock/shared";

export const VIEWER_CARD_WINDOW_LABEL = "viewer-card";

export type OpenViewerCardWindowOptions = {
  userId: string;
  displayName?: string;
  source?: CommentSource;
};

type NavigableWebviewWindow = WebviewWindow & {
  navigate?: (url: string) => Promise<void>;
};

export async function openViewerCardWindow({
  displayName,
  source,
  userId,
}: OpenViewerCardWindowOptions): Promise<WebviewWindow> {
  const url = createViewerCardWindowUrl(userId, { displayName, source });
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

  await waitForWebviewWindowCreated(viewerCardWindow);
  await viewerCardWindow.setFocus();
  return viewerCardWindow;
}

export function createViewerCardWindowUrl(
  userId: string,
  options: Pick<OpenViewerCardWindowOptions, "displayName" | "source"> = {},
): string {
  const params = new URLSearchParams();
  if (options.displayName) {
    params.set("displayName", options.displayName);
  }
  if (options.source) {
    params.set("source", options.source);
  }
  const query = params.toString();
  return `#/viewer-card/${encodeURIComponent(userId)}${query ? `?${query}` : ""}`;
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

const waitForWebviewWindowCreated = (window: WebviewWindow): Promise<void> =>
  new Promise((resolve, reject) => {
    void window.once("tauri://created", () => {
      resolve();
    });
    void window.once<string>("tauri://error", (event) => {
      reject(new Error(event.payload));
    });
  });
