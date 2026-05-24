import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructorMock, getByLabelMock, navigateMock, setFocusMock } =
  vi.hoisted(() => ({
    constructorMock: vi.fn<(label: string, options: unknown) => void>(),
    getByLabelMock: vi.fn<() => Promise<unknown>>(),
    navigateMock: vi.fn<(url: string) => Promise<void>>(),
    setFocusMock: vi.fn<() => Promise<void>>(),
  }));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: class {
    static getByLabel = getByLabelMock;

    navigate = navigateMock;
    once = vi.fn((eventName: string, handler: () => void) => {
      if (eventName === "tauri://created") {
        handler();
      }
      return Promise.resolve(() => undefined);
    });
    setFocus = setFocusMock;

    constructor(label: string, options: unknown) {
      constructorMock(label, options);
    }
  },
}));

import {
  createViewerCardWindowLabel,
  createViewerCardWindowUrl,
  openViewerCardWindow,
} from "./open-viewer-card-window";

describe("openViewerCardWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByLabelMock.mockResolvedValue(null);
    navigateMock.mockResolvedValue();
    setFocusMock.mockResolvedValue();
  });

  it("viewer-card URL を HashRouter 用に生成する", () => {
    expect(createViewerCardWindowUrl("youtube", "user 1")).toBe(
      "#/viewer-card/youtube/user%201",
    );
  });

  it("viewer-card ウィンドウラベルを platform/platformUserId から生成する", () => {
    expect(createViewerCardWindowLabel("youtube", "u1")).toBe(
      "viewer-card-youtube-u1",
    );
    expect(createViewerCardWindowLabel("twitch", "abc xyz")).toBe(
      "viewer-card-twitch-abc xyz",
    );
  });

  it("既存 window があれば遷移して focus する", async () => {
    const existingWindow = {
      navigate: navigateMock,
      setFocus: setFocusMock,
    };
    getByLabelMock.mockResolvedValue(existingWindow);

    await openViewerCardWindow({
      platform: "youtube",
      platformUserId: "u2",
      displayName: "mika_sub",
    });

    expect(getByLabelMock).toHaveBeenCalledWith("viewer-card-youtube-u2");
    expect(navigateMock).toHaveBeenCalledWith("#/viewer-card/youtube/u2");
    expect(setFocusMock).toHaveBeenCalledOnce();
    expect(constructorMock).not.toHaveBeenCalled();
  });

  it("既存 window がなければ新しい window を作成して focus する", async () => {
    await openViewerCardWindow({
      platform: "youtube",
      platformUserId: "u1",
      displayName: "ねこまる",
    });

    expect(constructorMock).toHaveBeenCalledWith(
      "viewer-card-youtube-u1",
      expect.objectContaining({
        url: "#/viewer-card/youtube/u1",
        title: "ねこまる - 関係性カード",
        width: 490,
        height: 720,
        minWidth: 360,
        minHeight: 520,
        resizable: true,
        alwaysOnTop: true,
        decorations: true,
        visible: true,
      }),
    );
    expect(setFocusMock).toHaveBeenCalledOnce();
  });
});
