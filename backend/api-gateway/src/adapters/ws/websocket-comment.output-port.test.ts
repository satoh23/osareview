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
  SESSION_PLATFORMS,
  SESSION_STATES,
  type CommentDeliveryMessage,
} from "@comment-dock/shared";
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

type WebSocketClientFixture = {
  client: WebSocket;
  readMessage: () => Promise<CommentDeliveryMessage>;
};

const connectClient = async (port: number): Promise<WebSocketClientFixture> => {
  const client = new WebSocket(`ws://127.0.0.1:${port}`);
  const messages: CommentDeliveryMessage[] = [];
  const waiters: Array<() => void> = [];

  client.on("message", (received) => {
    messages.push(JSON.parse(String(received)) as CommentDeliveryMessage);
    waiters.shift()?.();
  });

  await once(client, "open");

  return {
    client,
    async readMessage() {
      if (messages.length === 0) {
        await new Promise<void>((resolve) => {
          waiters.push(resolve);
        });
      }
      const message = messages.shift();
      if (!message) {
        throw new Error("failed to read WebSocket message");
      }
      return message;
    },
  };
};

test("新規接続時に現在の session.state スナップショットを送信する", async () => {
  const port = await reservePort();
  const outputPort = new WebSocketCommentOutputPort();

  await outputPort.start({ host: "127.0.0.1", port });
  const { client, readMessage } = await connectClient(port);

  const first = await readMessage();
  const second = await readMessage();

  assert.deepEqual(
    [first, second],
    [
      {
        type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
        payload: {
          platform: SESSION_PLATFORMS.YOUTUBE,
          state: SESSION_STATES.IDLE,
        },
      },
      {
        type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
        payload: {
          platform: SESSION_PLATFORMS.TWITCH,
          state: SESSION_STATES.IDLE,
        },
      },
    ],
  );

  client.close();
  await outputPort.close();
});

test("publishSessionState は接続中クライアントへ状態を配信し、次回接続スナップショットにも反映する", async () => {
  const port = await reservePort();
  const outputPort = new WebSocketCommentOutputPort();

  await outputPort.start({ host: "127.0.0.1", port });
  const firstConnection = await connectClient(port);
  await firstConnection.readMessage();
  await firstConnection.readMessage();

  const liveUpdatePromise = firstConnection.readMessage();
  await outputPort.publishSessionState({
    platform: SESSION_PLATFORMS.YOUTUBE,
    state: SESSION_STATES.CONNECTED,
  });
  assert.deepEqual(await liveUpdatePromise, {
    type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
    payload: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    },
  });
  firstConnection.client.close();

  const secondConnection = await connectClient(port);
  const snapshots = [
    await secondConnection.readMessage(),
    await secondConnection.readMessage(),
  ];

  assert.deepEqual(snapshots[0], {
    type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
    payload: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    },
  });

  secondConnection.client.close();
  await outputPort.close();
});

test("コメントを WebSocket クライアントへ append メッセージで配信できる", async () => {
  const port = await reservePort();
  const outputPort = new WebSocketCommentOutputPort();

  await outputPort.start({ host: "127.0.0.1", port });
  const { client, readMessage } = await connectClient(port);
  await readMessage();
  await readMessage();

  const comment = {
    id: "c1",
    source: COMMENT_SOURCES.TWITCH,
    author: { id: "u1", name: "alice" },
    text: "hello",
    publishedAt: "2026-05-06T10:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
  };

  const messagePromise = readMessage();
  await outputPort.outputToUi([comment]);
  const parsed = await messagePromise;

  assert.equal(parsed.type, COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND);
  if (parsed.type === COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND) {
    assert.deepEqual(parsed.payload.comment, comment);
  }

  client.close();
  await outputPort.close();
});
