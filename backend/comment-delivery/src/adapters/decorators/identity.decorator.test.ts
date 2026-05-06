import test from "node:test";
import assert from "node:assert/strict";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import { IdentityDecorator } from "./identity.decorator.js";

test("IdentityDecorator は入力コメントをそのまま返す", () => {
  const decorator = new IdentityDecorator();
  const input = {
    id: "c1",
    source: COMMENT_SOURCES.YOUTUBE,
    author: { id: "u1", name: "alice" },
    text: "hello",
    publishedAt: "2026-05-06T08:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
  };

  const output = decorator.decorate(input);
  assert.equal(output, input);
});
