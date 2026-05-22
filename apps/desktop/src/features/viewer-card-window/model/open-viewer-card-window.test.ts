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
  createViewerCardWindowUrl,
  openViewerCardWindow,
  VIEWER_CARD_WINDOW_LABEL,
} from "./open-viewer-card-window";

describe("openViewerCardWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByLabelMock.mockResolvedValue(null);
    navigateMock.mockResolvedValue();
    setFocusMock.mockResolvedValue();
  });

  it("viewer-card URL を HashRouter 用に生成する", () => {
    expect(
      createViewerCardWindowUrl("user 1", {
        displayName: "ねこまる",
        source: "youtube",
      }),
    ).toBe(
      "#/viewer-card/user%201?displayName=%E3%81%AD%E3%81%93%E3%81%BE%E3%82%8B&source=youtube",
    );
  });

  it("既存 window があれば遷移して focus する", async () => {
    const existingWindow = {
      navigate: navigateMock,
      setFocus: setFocusMock,
    };
    getByLabelMock.mockResolvedValue(existingWindow);

    await openViewerCardWindow({ displayName: "mika_sub", userId: "u2" });

    expect(getByLabelMock).toHaveBeenCalledWith(VIEWER_CARD_WINDOW_LABEL);
    expect(navigateMock).toHaveBeenCalledWith(
      "#/viewer-card/u2?displayName=mika_sub",
    );
    expect(setFocusMock).toHaveBeenCalledOnce();
    expect(constructorMock).not.toHaveBeenCalled();
  });

  it("既存 window がなければプロトタイプ相当の別 window を作成して focus する", async () => {
    await openViewerCardWindow({ displayName: "ねこまる", userId: "u1" });

    expect(constructorMock).toHaveBeenCalledWith(
      VIEWER_CARD_WINDOW_LABEL,
      expect.objectContaining({
        url: "#/viewer-card/u1?displayName=%E3%81%AD%E3%81%93%E3%81%BE%E3%82%8B",
        title: "ねこまる - 関係性カード",
        width: 420,
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
