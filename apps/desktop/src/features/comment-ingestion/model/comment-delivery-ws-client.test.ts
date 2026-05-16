import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  SESSION_PLATFORMS,
  SESSION_STATES,
  type CommentViewDto,
} from "@comment-dock/shared";

const { upsertLiveSessionMock, enqueueMock, startMock, stopMock } = vi.hoisted(
  () => ({
    upsertLiveSessionMock: vi.fn<() => Promise<number>>(),
    enqueueMock: vi.fn<(item: unknown) => void>(),
    startMock: vi.fn<() => void>(),
    stopMock: vi.fn<() => Promise<number>>(),
  }),
);

vi.mock("../../../entities/live-session/api/live-sessions.repository", () => ({
  upsertLiveSession: upsertLiveSessionMock,
}));

vi.mock("./comment-write-queue", () => ({
  CommentWriteQueue: class {
    enqueue = enqueueMock;
    start = startMock;
    stop = stopMock;
  },
}));

import { createCommentIngestionRuntime } from "./comment-delivery-ws-client";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.onclose?.();
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data });
  }
}

describe("CommentDeliveryWsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeWebSocket.instances = [];
    upsertLiveSessionMock.mockResolvedValue(1);
    stopMock.mockResolvedValue(0);
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  it("session.state メッセージを onSessionState に渡す", async () => {
    const onSessionState = vi.fn();
    const runtime = createCommentIngestionRuntime({
      wsUrl: "ws://localhost:17331",
      onSessionState,
    });

    runtime.start();
    FakeWebSocket.instances[0]?.emitMessage(
      JSON.stringify({
        type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
        payload: {
          platform: SESSION_PLATFORMS.YOUTUBE,
          state: SESSION_STATES.CONNECTED,
        },
      }),
    );

    expect(onSessionState).toHaveBeenCalledWith({
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    });
    expect(enqueueMock).not.toHaveBeenCalled();

    await runtime.stop(false);
  });

  it("comments.append メッセージは従来通りキューへ積む", async () => {
    const onSessionState = vi.fn();
    const runtime = createCommentIngestionRuntime({
      wsUrl: "ws://localhost:17331",
      onSessionState,
    });
    const comment: CommentViewDto = {
      id: "comment-1",
      source: COMMENT_SOURCES.YOUTUBE,
      author: { id: "user-1", name: "alice" },
      text: "hello",
      publishedAt: "2026-05-16T00:00:00.000Z",
      eventType: COMMENT_EVENT_TYPES.NORMAL,
    };

    runtime.start();
    FakeWebSocket.instances[0]?.emitMessage(
      JSON.stringify({
        type: COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND,
        payload: { comment },
      }),
    );

    expect(onSessionState).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(enqueueMock).toHaveBeenCalledTimes(1);
    });

    await runtime.stop(false);
  });
});
