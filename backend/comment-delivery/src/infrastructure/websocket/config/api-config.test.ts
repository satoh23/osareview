import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { EnvWebSocketConfigProvider } from "./api-config.js";

test("環境変数未指定時はデフォルト endpoint を返す", () => {
  const originalHost = process.env.COMMENT_DELIVERY_WS_HOST;
  const originalPort = process.env.COMMENT_DELIVERY_WS_PORT;
  delete process.env.COMMENT_DELIVERY_WS_HOST;
  delete process.env.COMMENT_DELIVERY_WS_PORT;

  try {
    const provider = new EnvWebSocketConfigProvider();
    assert.deepEqual(provider.getEndpoint(), {
      host: "127.0.0.1",
      port: 17331,
    });
  } finally {
    if (originalHost !== undefined) {
      process.env.COMMENT_DELIVERY_WS_HOST = originalHost;
    } else {
      delete process.env.COMMENT_DELIVERY_WS_HOST;
    }
    if (originalPort !== undefined) {
      process.env.COMMENT_DELIVERY_WS_PORT = originalPort;
    } else {
      delete process.env.COMMENT_DELIVERY_WS_PORT;
    }
  }
});

test("不正な port なら例外を投げる", () => {
  const originalPort = process.env.COMMENT_DELIVERY_WS_PORT;
  process.env.COMMENT_DELIVERY_WS_PORT = "bad-port";

  try {
    const provider = new EnvWebSocketConfigProvider();
    assert.throws(() => provider.getEndpoint());
  } finally {
    if (originalPort !== undefined) {
      process.env.COMMENT_DELIVERY_WS_PORT = originalPort;
    } else {
      delete process.env.COMMENT_DELIVERY_WS_PORT;
    }
  }
});
