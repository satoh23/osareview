import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { CommentIngestionRuntime } from "../../features/comment-ingestion";

export type RuntimeLifecycleBinding = {
  unbind: () => void;
  isCloseHandled: () => boolean;
};

/**
 * ウィンドウの close 要求とランタイム停止を結びつける。
 * close 時は graceful shutdown してからウィンドウを破棄する。
 */
export async function bindRuntimeCloseLifecycle(
  runtime: CommentIngestionRuntime,
): Promise<RuntimeLifecycleBinding> {
  const window = getCurrentWebviewWindow();
  let closeHandled = false;

  const unlisten = await window.onCloseRequested(async (event) => {
    if (closeHandled) {
      return;
    }
    closeHandled = true;
    event.preventDefault();
    await runtime.stop(true);
    await window.destroy();
  });

  return {
    unbind: () => {
      unlisten();
    },
    isCloseHandled: () => closeHandled,
  };
}
