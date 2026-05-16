import { describe, expect, it, vi } from "vitest";
import { SESSION_PLATFORMS, SESSION_STATES } from "@comment-dock/shared";
import {
  publishSessionState,
  subscribeSessionState,
} from "./session-state-events";

describe("session-state-events", () => {
  it("subscribe した listener に session.state を配送する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionState(listener);

    publishSessionState({
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    });

    expect(listener).toHaveBeenCalledWith({
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    });

    unsubscribe();
  });

  it("unsubscribe 後は listener を呼ばない", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionState(listener);
    unsubscribe();

    publishSessionState({
      platform: SESSION_PLATFORMS.TWITCH,
      state: SESSION_STATES.IDLE,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
