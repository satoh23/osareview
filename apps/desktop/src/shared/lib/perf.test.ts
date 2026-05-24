import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markPerf, measurePerf } from "./perf";

describe("markPerf", () => {
  beforeEach(() => {
    vi.spyOn(performance, "mark").mockImplementation(
      () => ({}) as PerformanceMark,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("performance.mark を指定した名前で呼び出す", () => {
    markPerf("viewer-card:open-start");
    expect(performance.mark).toHaveBeenCalledWith("viewer-card:open-start");
  });

  it("performance が undefined のとき例外を投げない", () => {
    const original = globalThis.performance;
    Object.defineProperty(globalThis, "performance", {
      value: undefined,
      configurable: true,
    });
    expect(() => markPerf("test")).not.toThrow();
    Object.defineProperty(globalThis, "performance", {
      value: original,
      configurable: true,
    });
  });
});

describe("measurePerf", () => {
  beforeEach(() => {
    vi.spyOn(performance, "measure").mockImplementation(
      () => ({ name: "test-measure", duration: 123.4 }) as PerformanceMeasure,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("performance.measure を指定した名前と mark で呼び出す", () => {
    measurePerf(
      "viewer-card:webview-create",
      "viewer-card:open-start",
      "viewer-card:webview-created",
    );
    expect(performance.measure).toHaveBeenCalledWith(
      "viewer-card:webview-create",
      "viewer-card:open-start",
      "viewer-card:webview-created",
    );
  });

  it("performance.measure が例外を投げても呼び出し元には伝播しない", () => {
    vi.spyOn(performance, "measure").mockImplementation(() => {
      throw new Error("mark not found");
    });
    expect(() =>
      measurePerf("test", "missing-start", "missing-end"),
    ).not.toThrow();
  });

  it("performance が undefined のとき例外を投げない", () => {
    const original = globalThis.performance;
    Object.defineProperty(globalThis, "performance", {
      value: undefined,
      configurable: true,
    });
    expect(() => measurePerf("test", "a", "b")).not.toThrow();
    Object.defineProperty(globalThis, "performance", {
      value: original,
      configurable: true,
    });
  });
});
