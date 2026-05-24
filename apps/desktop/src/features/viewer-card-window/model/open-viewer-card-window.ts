import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { CommentSource } from "@comment-dock/shared";

export type OpenViewerCardWindowOptions = {
  platform: CommentSource;
  platformUserId: string;
  displayName?: string;
};

type NavigableWebviewWindow = WebviewWindow & {
  navigate?: (url: string) => Promise<void>;
};

export function createViewerCardWindowLabel(
  platform: CommentSource,
  platformUserId: string,
): string {
  return `viewer-card-${platform}-${platformUserId}`;
}

export async function openViewerCardWindow({
  platform,
  platformUserId,
  displayName,
}: OpenViewerCardWindowOptions): Promise<WebviewWindow> {
  const label = createViewerCardWindowLabel(platform, platformUserId);
  const url = createViewerCardWindowUrl(platform, platformUserId);
  const existingWindow = await WebviewWindow.getByLabel(label);

  if (existingWindow) {
    await navigateViewerCardWindow(existingWindow, url);
    await existingWindow.setFocus();
    return existingWindow;
  }

  const viewerCardWindow = new WebviewWindow(label, {
    url,
    title: createViewerCardWindowTitle(displayName),
    width: 490,
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
  platform: CommentSource,
  platformUserId: string,
): string {
  return `#/viewer-card/${encodeURIComponent(platform)}/${encodeURIComponent(platformUserId)}`;
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
