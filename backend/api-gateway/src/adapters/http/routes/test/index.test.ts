import test from "node:test";
import assert from "node:assert/strict";
import type { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import type { Comment } from "@comment-dock/comment-fetcher";
import { createTestCommentsRouter } from "./index.js";

const buildComment = (overrides?: Partial<Comment>): Comment => ({
  id: "c1",
  source: "youtube",
  author: { id: "u1", name: "テストユーザー" },
  text: "テストコメント",
  publishedAt: new Date("2024-01-01T00:00:00.000Z"),
  eventType: "normal",
  ...overrides,
});

const buildUseCase = (
  receivedCalls: { method: string; args: unknown[] }[],
): DeliverCommentsUseCase =>
  ({
    deliverComments: async (comments: readonly Comment[]) => {
      receivedCalls.push({ method: "deliverComments", args: [comments] });
    },
  }) as unknown as DeliverCommentsUseCase;

const postComments = async (
  useCase: DeliverCommentsUseCase,
  body: unknown,
): Promise<Response> => {
  const app = createTestCommentsRouter(useCase);
  return app.request("/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

test("正常系: comments 配列を受け取り deliverComments を呼ぶ", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);
  const comment = buildComment();

  const response = await postComments(useCase, {
    comments: [
      {
        id: comment.id,
        source: comment.source,
        author: comment.author,
        text: comment.text,
        publishedAt: comment.publishedAt.toISOString(),
        eventType: comment.eventType,
      },
    ],
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { accepted: 1 });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "deliverComments");
  const deliveredComments = calls[0].args[0] as readonly Comment[];
  assert.equal(deliveredComments.length, 1);
  assert.equal(deliveredComments[0].id, "c1");
  assert.ok(
    deliveredComments[0].publishedAt instanceof Date,
    "publishedAt は Date インスタンスであること",
  );
  assert.equal(
    deliveredComments[0].publishedAt.toISOString(),
    "2024-01-01T00:00:00.000Z",
  );
});

test("正常系: monetaryAmount 付きコメントを正しく受け取る", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);

  const response = await postComments(useCase, {
    comments: [
      {
        id: "c2",
        source: "youtube",
        author: { id: "u2", name: "スパチャユーザー" },
        text: "スパチャです",
        publishedAt: "2024-06-01T12:00:00.000Z",
        eventType: "super_chat",
        monetaryAmount: { currency: "JPY", amount: 1000 },
      },
    ],
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { accepted: 1 });

  const deliveredComments = calls[0].args[0] as readonly Comment[];
  assert.deepEqual(deliveredComments[0].monetaryAmount, {
    currency: "JPY",
    amount: 1000,
  });
});

test("正常系: 空配列のとき 200 で accepted: 0 を返し deliverComments を呼ばない", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);

  const response = await postComments(useCase, { comments: [] });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { accepted: 0 });
  assert.equal(calls.length, 0);
});

test("異常系: comments フィールドがないとき 400 を返す", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);

  const response = await postComments(useCase, { unexpected: "field" });

  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("異常系: source が不正な値のとき 400 を返す", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);

  const response = await postComments(useCase, {
    comments: [
      {
        id: "c1",
        source: "unknown_platform",
        author: { id: "u1", name: "user" },
        text: "hello",
        publishedAt: new Date().toISOString(),
        eventType: "normal",
      },
    ],
  });

  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("異常系: eventType が不正な値のとき 400 を返す", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);

  const response = await postComments(useCase, {
    comments: [
      {
        id: "c1",
        source: "youtube",
        author: { id: "u1", name: "user" },
        text: "hello",
        publishedAt: new Date().toISOString(),
        eventType: "unknown_event",
      },
    ],
  });

  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("異常系: JSON でないリクエストボディのとき 400 を返す", async () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const useCase = buildUseCase(calls);
  const app = createTestCommentsRouter(useCase);

  const response = await app.request("/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
  });

  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});
