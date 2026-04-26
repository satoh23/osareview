import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { TwitchCommentRepository } from "./comment.repository.js";
import type { FetchCommentsResult } from "../../../usecases/comment-collection/comment-repository.interface.js";

test("EventSubイベントを共通コメントへ変換して返す", async () => {
  const streamInputs: Array<{ broadcasterUserId: string; userId: string }> = [];
  const eventSubClient = {
    async *streamChatEvents(input: {
      broadcasterUserId: string;
      userId: string;
    }) {
      streamInputs.push(input);
      yield {
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
        message_type: "text" as const,
      };
      yield {
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
        notice_type: "sub" as const,
      };
    },
  };

  const helixClient = {
    async getSelfUserId() {
      return "2914196";
    },
  };

  const repository = new TwitchCommentRepository(
    eventSubClient as never,
    helixClient as never,
  );

  const results: FetchCommentsResult[] = [];
  for await (const chunk of repository.streamComments({
    liveChatId: "141981764",
  })) {
    results.push(chunk);
  }

  assert.deepEqual(streamInputs, [
    { broadcasterUserId: "141981764", userId: "2914196" },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.comments[0]?.id, "m-1");
  assert.equal(results[0]?.comments[0]?.eventType, "normal");
  assert.equal(results[0]?.nextPageToken, undefined);
  assert.equal(results[1]?.comments[0]?.id, "n-1");
  assert.equal(results[1]?.comments[0]?.eventType, "subscription");
  assert.equal(results[1]?.nextPageToken, undefined);
});
