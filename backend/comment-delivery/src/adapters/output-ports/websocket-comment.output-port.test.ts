import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { WebSocket } from "ws";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentDeliveryMessage,
} from "@comment-dock/shared";
import type { WebSocketConfigProvider } from "../../infrastructure/websocket/config/api-config.js";
import { WebSocketCommentOutputPort } from "./websocket-comment.output-port.js";

const reservePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to reserve port");
  }
  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
};

test("コメントを WebSocket クライアントへ append メッセージで配信できる", async () => {
  const port = await reservePort();
  const configProvider: WebSocketConfigProvider = {
    getEndpoint: () => ({ host: "127.0.0.1", port }),
  };
  const outputPort = new WebSocketCommentOutputPort(configProvider);

  await outputPort.outputToUi([]);

  const client = new WebSocket(`ws://127.0.0.1:${port}`);
  await once(client, "open");

  const comment = {
    id: "c1",
    source: COMMENT_SOURCES.TWITCH,
    author: { id: "u1", name: "alice" },
    text: "hello",
    publishedAt: "2026-05-06T10:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
  };

  const messagePromise = once(client, "message");
  await outputPort.outputToUi([comment]);
  const [received] = await messagePromise;
  const parsed = JSON.parse(String(received)) as CommentDeliveryMessage;

  assert.equal(parsed.type, COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND);
  if (parsed.type === COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND) {
    assert.deepEqual(parsed.payload.comment, comment);
  }

  client.close();
  await outputPort.close();
});
