import test from "node:test";
import assert from "node:assert/strict";
import {
  createLoopbackOAuthCallbackServer,
  LoopbackOAuthError,
} from "./loopback.server.js";

test("code と state が一致すれば authorizationCode が解決する", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "state-xyz",
    timeoutMs: 5_000,
  });
  assert.match(session.redirectUri, /^http:\/\/127\.0\.0\.1:\d+\/callback$/);

  const fetchPromise = fetch(
    `${session.redirectUri}?code=auth-code-1&state=state-xyz`,
  );
  const codePromise = session.authorizationCode;
  const [res, code] = await Promise.all([fetchPromise, codePromise]);

  assert.equal(res.status, 200);
  assert.equal(code, "auth-code-1");
});

test("state が一致しなければ LoopbackOAuthError", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "expected",
    timeoutMs: 5_000,
  });

  const rejected = assert.rejects(session.authorizationCode, (err: unknown) => {
    assert.ok(err instanceof LoopbackOAuthError);
    assert.match((err as Error).message, /state mismatch/);
    return true;
  });
  const res = await fetch(`${session.redirectUri}?code=c&state=wrong`);
  assert.equal(res.status, 400);
  await rejected;
});

test("error クエリなら LoopbackOAuthError（oauthError 付き）", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "s",
    timeoutMs: 5_000,
  });

  const rejected = assert.rejects(session.authorizationCode, (err: unknown) => {
    assert.ok(err instanceof LoopbackOAuthError);
    const e = err as LoopbackOAuthError;
    assert.equal(e.oauthError, "access_denied");
    assert.equal(e.oauthErrorDescription, "no");
    return true;
  });
  const res = await fetch(
    `${session.redirectUri}?state=s&error=access_denied&error_description=no`,
  );
  assert.equal(res.status, 400);
  await rejected;
});

test("code が無ければ LoopbackOAuthError", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "s",
    timeoutMs: 5_000,
  });

  const rejected = assert.rejects(session.authorizationCode, (err: unknown) => {
    assert.ok(err instanceof LoopbackOAuthError);
    assert.match((err as Error).message, /missing code/);
    return true;
  });
  const res = await fetch(`${session.redirectUri}?state=s`);
  assert.equal(res.status, 400);
  await rejected;
});

test("タイムアウトすると authorizationCode が reject", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "s",
    timeoutMs: 80,
  });

  await assert.rejects(session.authorizationCode, (err: unknown) => {
    assert.ok(err instanceof LoopbackOAuthError);
    assert.match((err as Error).message, /timed out/);
    return true;
  });
});

test("1 回目で解決したあとサーバーを閉じ、2 回目は接続できない", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "s2",
    timeoutMs: 5_000,
  });

  const first = await fetch(`${session.redirectUri}?code=once&state=s2`);
  assert.equal(first.status, 200);
  assert.equal(await session.authorizationCode, "once");

  await assert.rejects(
    fetch(`${session.redirectUri}?code=twice&state=s2`),
    (err: unknown) => err instanceof TypeError,
  );
});

test("callback 以外のパスは 404（authorizationCode はタイムアウトまで待ち続ける）", async () => {
  const session = await createLoopbackOAuthCallbackServer({
    expectedState: "s",
    timeoutMs: 50,
  });

  const u = new URL(session.redirectUri);
  u.pathname = "/other";
  const res = await fetch(u);
  assert.equal(res.status, 404);

  await assert.rejects(session.authorizationCode, LoopbackOAuthError);
});
