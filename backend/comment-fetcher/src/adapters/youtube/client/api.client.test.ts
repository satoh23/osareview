import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { YouTubeApiClient } from "./api.client.js";

class FakeMetadata {
  private store = new Map<string, string[]>();

  set(key: string, value: string) {
    this.store.set(key, [value]);
  }

  get(key: string): string[] {
    return this.store.get(key) ?? [];
  }
}

function createMockRuntime(options: {
  onStreamStart?: (args: {
    request: Record<string, unknown>;
    metadata: FakeMetadata;
  }) => void;
  emit: (stream: EventEmitter) => void;
}) {
  return {
    loadSync: () => ({}),
    createSsl: () => ({}),
    Metadata: FakeMetadata,
    loadPackageDefinition: () => {
      class MockServiceClient {
        StreamList(request: Record<string, unknown>, metadata: FakeMetadata) {
          options.onStreamStart?.({ request, metadata });
          const stream = new EventEmitter() as EventEmitter & {
            cancel: () => void;
          };
          stream.cancel = () => {};
          queueMicrotask(() => {
            options.emit(stream);
          });
          return stream;
        }
      }
      return {
        youtube: {
          api: {
            v3: {
              V3DataLiveChatMessageService: MockServiceClient,
            },
          },
        },
      };
    },
  };
}

const authorizedTokenAccessorProvider = (accessToken: string) => ({
  createAuthorizedTokenAccessor() {
    return {
      async getCurrentAccessToken() {
        return accessToken;
      },
      async refresh() {
        return `${accessToken}-refreshed`;
      },
    };
  },
});

test("認可境界でアクセストークン取得に失敗した場合はエラーを伝播する", async () => {
  const client = new YouTubeApiClient(
    {
      createAuthorizedTokenAccessor() {
        return {
          async getCurrentAccessToken() {
            throw new Error("YouTube authorization failed.");
          },
          async refresh() {
            return "unused";
          },
        };
      },
    },
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  await assert.rejects(async () => {
    const stream = client.fetchLiveChatMessages({ liveChatId: "chat-id" });
    for await (const _chunk of stream) {
      break;
    }
  }, /YouTube authorization failed/);
});

test("streamList接続の正常系で受信チャンクを順次返す", async () => {
  let capturedMetadata: FakeMetadata | undefined;
  let capturedRequest: Record<string, unknown> | undefined;
  const runtime = createMockRuntime({
    onStreamStart: ({ request, metadata }) => {
      capturedRequest = request;
      capturedMetadata = metadata;
    },
    emit: (stream) => {
      stream.emit("data", {
        kind: "youtube#liveChatMessageListResponse",
        etag: "etag-1",
        next_page_token: "t1",
        items: [],
      });
      stream.emit("data", {
        kind: "youtube#liveChatMessageListResponse",
        etag: "etag-2",
        next_page_token: "t2",
        items: [],
      });
      stream.emit("end");
    },
  });

  const client = new YouTubeApiClient(
    authorizedTokenAccessorProvider("test-token"),
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
    runtime as never,
  );

  const chunks: Array<{ etag: string; next_page_token?: string }> = [];
  const stream = client.fetchLiveChatMessages({
    liveChatId: "live-chat-id",
    pageToken: "next-page",
  });
  for await (const chunk of stream) {
    chunks.push({ etag: chunk.etag, next_page_token: chunk.next_page_token });
  }

  assert.deepEqual(chunks, [
    { etag: "etag-1", next_page_token: "t1" },
    { etag: "etag-2", next_page_token: "t2" },
  ]);
  assert.equal(capturedRequest?.live_chat_id, "live-chat-id");
  assert.equal(capturedRequest?.page_token, "next-page");
  assert.equal(
    capturedMetadata?.get("authorization")?.[0],
    "Bearer test-token",
  );
});

test("streamList が UNAUTHENTICATED の場合は refresh 後の token で再接続する", async () => {
  const capturedTokens: string[] = [];
  let streamStartCount = 0;
  let refreshCount = 0;
  const runtime = createMockRuntime({
    onStreamStart: ({ metadata }) => {
      capturedTokens.push(metadata.get("authorization")?.[0] ?? "");
    },
    emit: (stream) => {
      streamStartCount += 1;
      if (streamStartCount === 1) {
        const error = new Error("UNAUTHENTICATED") as Error & { code: number };
        error.code = 16;
        stream.emit("error", error);
        return;
      }

      stream.emit("data", {
        kind: "youtube#liveChatMessageListResponse",
        etag: "etag-after-refresh",
        next_page_token: "t2",
        items: [],
      });
      stream.emit("end");
    },
  });

  const client = new YouTubeApiClient(
    {
      createAuthorizedTokenAccessor() {
        return {
          async getCurrentAccessToken() {
            return "expired-token";
          },
          async refresh() {
            refreshCount += 1;
            return "refreshed-token";
          },
        };
      },
    },
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
    runtime as never,
  );

  const chunks: Array<{ etag: string }> = [];
  const stream = client.fetchLiveChatMessages({ liveChatId: "chat-id" });
  for await (const chunk of stream) {
    chunks.push({ etag: chunk.etag });
  }

  assert.deepEqual(capturedTokens, [
    "Bearer expired-token",
    "Bearer refreshed-token",
  ]);
  assert.equal(refreshCount, 1);
  assert.deepEqual(chunks, [{ etag: "etag-after-refresh" }]);
});

test("streamList接続のエラーは呼び出し側へ伝播する", async () => {
  const runtime = createMockRuntime({
    emit: (stream) => {
      stream.emit("error", new Error("stream failed"));
    },
  });

  const client = new YouTubeApiClient(
    authorizedTokenAccessorProvider("test-token"),
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
    runtime as never,
  );

  await assert.rejects(async () => {
    const stream = client.fetchLiveChatMessages({ liveChatId: "chat-id" });
    for await (const _chunk of stream) {
      // no-op
    }
  }, /stream failed/);
});
