import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { TwitchEventSubWebSocketClient } from "./eventsub-websocket.client.js";

class FakeWebSocket extends EventEmitter {
  readyState: number = WebSocket.CONNECTING;

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.emit("open");
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.emit("close");
  }
}

function createClientForTest() {
  const socket = new FakeWebSocket();
  const subscriptions: Array<{
    type: string;
    version: string;
    condition: { broadcaster_user_id: string; user_id: string };
    sessionId: string;
  }> = [];

  const client = new TwitchEventSubWebSocketClient(
    {
      async createEventSubSubscription(input: {
        type: string;
        version: string;
        condition: { broadcaster_user_id: string; user_id: string };
        sessionId: string;
      }) {
        subscriptions.push(input);
      },
    } as never,
    {
      getHelixApiBaseUrl() {
        return "https://api.twitch.tv/helix";
      },
      getEventSubWebSocketUrl() {
        return "wss://eventsub.wss.twitch.tv/ws";
      },
      getClientId() {
        return "client-id";
      },
    },
    {
      createClient: () => socket as unknown as WebSocket,
    } as never,
  );

  return { client, socket, subscriptions };
}

async function waitForNextTick(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

test("welcome後に2購読し、notificationイベントをyieldする", async () => {
  const { client, socket, subscriptions } = createClientForTest();
  const stream = client.streamChatEvents({
    broadcasterUserId: "141981764",
    userId: "2914196",
  }) as AsyncGenerator<{ message_id?: string }, void, unknown>;

  const nextPromise = stream.next();
  await waitForNextTick();
  socket.open();
  await waitForNextTick();
  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "session_welcome",
        message_id: "welcome-1",
      },
      payload: {
        session: {
          id: "session-1",
          keepalive_timeout_seconds: 10,
          reconnect_url: null,
        },
      },
    }),
  );
  await waitForNextTick();
  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "notification",
        message_id: "notification-1",
        subscription_type: "channel.chat.message",
        subscription_version: "1",
      },
      payload: {
        subscription: {
          id: "sub-1",
          type: "channel.chat.message",
          version: "1",
          status: "enabled",
          condition: {
            broadcaster_user_id: "141981764",
            user_id: "2914196",
          },
          transport: {
            method: "websocket",
            session_id: "session-1",
          },
        },
        event: {
          broadcaster_user_id: "141981764",
          broadcaster_user_login: "streamer",
          broadcaster_user_name: "Streamer",
          chatter_user_id: "1",
          chatter_user_login: "viewer1",
          chatter_user_name: "Viewer1",
          message_id: "m-1",
          message: { text: "hello", fragments: [] },
          color: "",
          badges: [],
          message_type: "text",
        },
      },
    }),
  );

  const first = await nextPromise;
  assert.equal(first.done, false);
  assert.equal(first.value?.message_id, "m-1");
  assert.equal(subscriptions.length, 2);
  assert.deepEqual(subscriptions.map((item) => item.type).sort(), [
    "channel.chat.message",
    "channel.chat.notification",
  ]);

  await stream.return(undefined);
});

test("notification以外のmessage_typeはキューに積まず無視する", async () => {
  const { client, socket } = createClientForTest();
  const stream = client.streamChatEvents({
    broadcasterUserId: "141981764",
    userId: "2914196",
  }) as AsyncGenerator<{ message_id?: string }, void, unknown>;

  const nextPromise = stream.next();
  await waitForNextTick();
  socket.open();
  await waitForNextTick();
  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "session_welcome",
        message_id: "welcome-1",
      },
      payload: {
        session: {
          id: "session-1",
          keepalive_timeout_seconds: 10,
          reconnect_url: null,
        },
      },
    }),
  );
  await waitForNextTick();

  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "session_reconnect",
        message_id: "reconnect-1",
      },
      payload: {
        session: {
          id: "session-1",
          reconnect_url: "wss://reconnect.example/ws",
        },
      },
    }),
  );

  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "notification",
        message_id: "notification-1",
        subscription_type: "channel.chat.notification",
        subscription_version: "1",
      },
      payload: {
        subscription: {
          id: "sub-2",
          type: "channel.chat.notification",
          version: "1",
          status: "enabled",
          condition: {
            broadcaster_user_id: "141981764",
            user_id: "2914196",
          },
          transport: {
            method: "websocket",
            session_id: "session-1",
          },
        },
        event: {
          broadcaster_user_id: "141981764",
          broadcaster_user_login: "streamer",
          broadcaster_user_name: "Streamer",
          chatter_user_id: "2",
          chatter_user_login: "viewer2",
          chatter_user_name: "Viewer2",
          chatter_is_anonymous: false,
          color: "",
          badges: [],
          system_message: "viewer2 subscribed",
          message_id: "n-1",
          message: { text: "", fragments: [] },
          notice_type: "sub",
        },
      },
    }),
  );

  const result = await nextPromise;
  assert.equal(result.done, false);
  assert.equal(result.value?.message_id, "n-1");

  await stream.return(undefined);
});

test("socket error は AsyncIterable へ伝播する", async () => {
  const { client, socket } = createClientForTest();
  const stream = client.streamChatEvents({
    broadcasterUserId: "141981764",
    userId: "2914196",
  }) as AsyncGenerator<{ message_id?: string }, void, unknown>;

  const nextPromise = stream.next();
  await waitForNextTick();
  socket.open();
  await waitForNextTick();
  socket.emit(
    "message",
    JSON.stringify({
      metadata: {
        message_type: "session_welcome",
        message_id: "welcome-1",
      },
      payload: {
        session: {
          id: "session-1",
          keepalive_timeout_seconds: 10,
          reconnect_url: null,
        },
      },
    }),
  );
  await waitForNextTick();
  socket.emit("error", new Error("socket failed"));

  await assert.rejects(async () => {
    await nextPromise;
  }, /socket failed/);
});
