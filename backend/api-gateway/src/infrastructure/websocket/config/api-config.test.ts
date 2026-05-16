import test from "node:test";
import assert from "node:assert/strict";
import { getWebSocketApiEndpoint } from "./api-config.js";

const withEnv = (values: NodeJS.ProcessEnv, body: () => void): void => {
  const originalValues = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    body();
  } finally {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("WebSocket API endpoint は環境変数未指定時に既定値を返す", () => {
  withEnv(
    {
      API_GATEWAY_WS_HOST: undefined,
      API_GATEWAY_WS_PORT: undefined,
    },
    () => {
      assert.deepEqual(getWebSocketApiEndpoint(), {
        host: "127.0.0.1",
        port: 17331,
      });
    },
  );
});

test("WebSocket API endpoint は環境変数で上書きできる", () => {
  withEnv(
    {
      API_GATEWAY_WS_HOST: "0.0.0.0",
      API_GATEWAY_WS_PORT: "18081",
    },
    () => {
      assert.deepEqual(getWebSocketApiEndpoint(), {
        host: "0.0.0.0",
        port: 18081,
      });
    },
  );
});

test("WebSocket API port が不正な場合は例外を投げる", () => {
  withEnv(
    {
      API_GATEWAY_WS_PORT: "invalid",
    },
    () => {
      assert.throws(
        () => getWebSocketApiEndpoint(),
        /invalid API_GATEWAY_WS_PORT/,
      );
    },
  );
});
