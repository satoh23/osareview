import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIVE_STREAM_MAX_ATTEMPTS,
  DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
  getLiveStreamMaxAttempts,
  getLiveStreamPollingIntervalMs,
} from "./live-stream-detection.js";

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

test("配信検知ポーリング設定は既定で 5000ms x 5回を返す", () => {
  withEnv(
    {
      LIVE_STREAM_POLLING_INTERVAL_MS: undefined,
      LIVE_STREAM_MAX_ATTEMPTS: undefined,
    },
    () => {
      assert.equal(
        getLiveStreamPollingIntervalMs(),
        DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
      );
      assert.equal(
        getLiveStreamMaxAttempts(),
        DEFAULT_LIVE_STREAM_MAX_ATTEMPTS,
      );
      assert.equal(getLiveStreamPollingIntervalMs(), 5000);
      assert.equal(getLiveStreamMaxAttempts(), 5);
    },
  );
});

test("配信検知ポーリング設定は環境変数で上書きできる", () => {
  withEnv(
    {
      LIVE_STREAM_POLLING_INTERVAL_MS: "1500",
      LIVE_STREAM_MAX_ATTEMPTS: "8",
    },
    () => {
      assert.equal(getLiveStreamPollingIntervalMs(), 1500);
      assert.equal(getLiveStreamMaxAttempts(), 8);
    },
  );
});

test("配信検知ポーリング設定は不正な環境変数を既定値にフォールバックする", () => {
  withEnv(
    {
      LIVE_STREAM_POLLING_INTERVAL_MS: "0",
      LIVE_STREAM_MAX_ATTEMPTS: "not-a-number",
    },
    () => {
      assert.equal(
        getLiveStreamPollingIntervalMs(),
        DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
      );
      assert.equal(
        getLiveStreamMaxAttempts(),
        DEFAULT_LIVE_STREAM_MAX_ATTEMPTS,
      );
    },
  );
});
