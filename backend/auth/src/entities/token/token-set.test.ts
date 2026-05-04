import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS,
  TokenSet,
  type TokenSetPlain,
} from "./token-set.js";

const baseTokenSet = (overrides: Partial<TokenSetPlain> = {}): TokenSet =>
  TokenSet.create({
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 1_000_000,
    scope: "https://www.googleapis.com/auth/youtube.readonly",
    obtainedAt: 900_000,
    ...overrides,
  });

const withNow = (nowMs: number, fn: () => void): void => {
  const original = Date.now;
  Date.now = () => nowMs;
  try {
    fn();
  } finally {
    Date.now = original;
  }
};

test("TokenSet#isAccessTokenLive: 失効時刻の十分手前なら true", () => {
  const token = baseTokenSet({ expiresAt: 200_000 });
  withNow(100_000, () => {
    assert.equal(token.isAccessTokenLive(60_000), true);
  });
});

test("TokenSet#isAccessTokenLive: 失効後は false", () => {
  const token = baseTokenSet({ expiresAt: 100_000 });
  withNow(100_000, () => {
    assert.equal(token.isAccessTokenLive(60_000), false);
  });
  withNow(150_000, () => {
    assert.equal(token.isAccessTokenLive(60_000), false);
  });
});

test("TokenSet#isAccessTokenLive: デフォルトスキュー60秒以内なら false（先に refresh したい）", () => {
  const expiresAt = 1_000_000;
  const token = baseTokenSet({ expiresAt });
  const lastOk = expiresAt - DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS - 1;
  withNow(lastOk, () => {
    assert.equal(token.isAccessTokenLive(), true);
  });
  withNow(lastOk + 1, () => {
    assert.equal(token.isAccessTokenLive(), false);
  });
});

test("TokenSet#isAccessTokenLive: expiresAt が非有限なら false", () => {
  const token = baseTokenSet({ expiresAt: Number.NaN });
  withNow(0, () => {
    assert.equal(token.isAccessTokenLive(), false);
  });
});

test("TokenSet#isAccessTokenLive: Date.now が非有限なら false", () => {
  const token = baseTokenSet();
  const original = Date.now;
  Date.now = () => Number.NaN;
  try {
    assert.equal(token.isAccessTokenLive(), false);
  } finally {
    Date.now = original;
  }
});

test("TokenSet.toPlain / create で往復できる", () => {
  const plain: TokenSetPlain = {
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 42,
    scope: "s",
    obtainedAt: 7,
  };
  assert.deepEqual(TokenSet.create(plain).toPlain(), plain);
});

test("TokenSet.accessTokenExpiresAtMs: obtainedAt + expires_in 秒", () => {
  assert.equal(
    TokenSet.accessTokenExpiresAtMs(1_000, 3600),
    1_000 + 3600 * 1000,
  );
});

test("TokenSet.accessTokenExpiresAtMs: expires_in が 0 でもよい", () => {
  assert.equal(TokenSet.accessTokenExpiresAtMs(5_000, 0), 5_000);
});

test("TokenSet.accessTokenExpiresAtMs: 負の expires_in は例外", () => {
  assert.throws(() => TokenSet.accessTokenExpiresAtMs(0, -1), /non-negative/);
});

test("TokenSet.accessTokenExpiresAtMs: 非有限なら例外", () => {
  assert.throws(
    () => TokenSet.accessTokenExpiresAtMs(Number.NaN, 60),
    /finite/,
  );
});
