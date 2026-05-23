import test from "node:test";
import assert from "node:assert/strict";
import { getTestInjectEnabled } from "./test-inject.js";

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

test("API_GATEWAY_ENABLE_TEST_INJECT が未設定のとき false を返す", () => {
  withEnv({ API_GATEWAY_ENABLE_TEST_INJECT: undefined }, () => {
    assert.equal(getTestInjectEnabled(), false);
  });
});

test('API_GATEWAY_ENABLE_TEST_INJECT が "true" のとき true を返す', () => {
  withEnv({ API_GATEWAY_ENABLE_TEST_INJECT: "true" }, () => {
    assert.equal(getTestInjectEnabled(), true);
  });
});

test('API_GATEWAY_ENABLE_TEST_INJECT が "false" のとき false を返す', () => {
  withEnv({ API_GATEWAY_ENABLE_TEST_INJECT: "false" }, () => {
    assert.equal(getTestInjectEnabled(), false);
  });
});

test('API_GATEWAY_ENABLE_TEST_INJECT が "TRUE" (大文字) のとき false を返す', () => {
  withEnv({ API_GATEWAY_ENABLE_TEST_INJECT: "TRUE" }, () => {
    assert.equal(getTestInjectEnabled(), false);
  });
});
