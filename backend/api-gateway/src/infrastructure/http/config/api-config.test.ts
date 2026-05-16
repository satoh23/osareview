import test from "node:test";
import assert from "node:assert/strict";
import { getHttpApiEndpoint } from "./api-config.js";

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

test("HTTP API endpoint は環境変数未指定時に既定値を返す", () => {
  withEnv(
    {
      API_GATEWAY_HTTP_HOST: undefined,
      API_GATEWAY_HTTP_PORT: undefined,
    },
    () => {
      assert.deepEqual(getHttpApiEndpoint(), {
        host: "127.0.0.1",
        port: 17332,
      });
    },
  );
});

test("HTTP API endpoint は環境変数で上書きできる", () => {
  withEnv(
    {
      API_GATEWAY_HTTP_HOST: "0.0.0.0",
      API_GATEWAY_HTTP_PORT: "18080",
    },
    () => {
      assert.deepEqual(getHttpApiEndpoint(), {
        host: "0.0.0.0",
        port: 18080,
      });
    },
  );
});

test("HTTP API port が不正な場合は例外を投げる", () => {
  withEnv(
    {
      API_GATEWAY_HTTP_PORT: "invalid",
    },
    () => {
      assert.throws(
        () => getHttpApiEndpoint(),
        /invalid API_GATEWAY_HTTP_PORT/,
      );
    },
  );
});
