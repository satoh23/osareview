import { describe, expect, it } from "vitest";
import { isViewerCardWindowLabel } from "./use-window-label";

describe("isViewerCardWindowLabel", () => {
  it('"viewer-card-" プレフィックスを持つラベルを true と判定する', () => {
    expect(isViewerCardWindowLabel("viewer-card-youtube-u1")).toBe(true);
    expect(isViewerCardWindowLabel("viewer-card-twitch-abc")).toBe(true);
    expect(isViewerCardWindowLabel("viewer-card-youtube-スペース あり")).toBe(
      true,
    );
  });

  it('"viewer-card-" のみ（suffix が空）でも true と判定する', () => {
    expect(isViewerCardWindowLabel("viewer-card-")).toBe(true);
  });

  it('"viewer-card-" で始まらないラベルを false と判定する', () => {
    expect(isViewerCardWindowLabel("main")).toBe(false);
    expect(isViewerCardWindowLabel("")).toBe(false);
    expect(isViewerCardWindowLabel("viewer_card-youtube-u1")).toBe(false);
    expect(isViewerCardWindowLabel("VIEWER-CARD-youtube-u1")).toBe(false);
    expect(isViewerCardWindowLabel("viewer-card")).toBe(false);
  });

  it('"viewer-card-" を含むが先頭でない場合は false と判定する', () => {
    expect(isViewerCardWindowLabel("prefix-viewer-card-youtube-u1")).toBe(
      false,
    );
  });
});
