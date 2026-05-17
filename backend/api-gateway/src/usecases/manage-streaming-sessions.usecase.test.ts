import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  SESSION_PLATFORMS,
  SESSION_STATES,
} from "@comment-dock/shared";
import type { Comment } from "@comment-dock/comment-fetcher";
import type { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import {
  ManageStreamingSessionsUseCase,
  type SessionPipelineRunner,
} from "./manage-streaming-sessions.usecase.js";
import type {
  SessionStateOutputEvent,
  SessionStateOutputPort,
} from "./interfaces/session-state-output-port.interface.js";

const buildComment = (id: string): Comment => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "u1", name: "alice" },
  text: `comment-${id}`,
  publishedAt: new Date("2026-05-16T00:00:00.000Z"),
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});

const createUseCase = (
  youtubeRunner: SessionPipelineRunner,
  twitchRunner: SessionPipelineRunner = async () => {},
  failedResetDelayMs = 3000,
): {
  useCase: ManageStreamingSessionsUseCase;
  delivered: Comment[][];
  published: SessionStateOutputEvent[];
} => {
  const delivered: Comment[][] = [];
  const published: SessionStateOutputEvent[] = [];
  const deliverCommentsUseCase = {
    async deliverComments(comments: readonly Comment[]) {
      delivered.push([...comments]);
    },
  } as unknown as DeliverCommentsUseCase;
  const sessionStateOutputPort: SessionStateOutputPort = {
    async publishSessionState(event) {
      published.push(event);
    },
  };

  return {
    useCase: new ManageStreamingSessionsUseCase(
      deliverCommentsUseCase,
      sessionStateOutputPort,
      youtubeRunner,
      twitchRunner,
      failedResetDelayMs,
    ),
    delivered,
    published,
  };
};

test("start は対象プラットフォームの runner を起動してコメントを delivery に渡す", async () => {
  const { useCase, delivered, published } = createUseCase(
    async (_options, outputPort, controls) => {
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTING,
      });
      await outputPort.outputComments([buildComment("1")]);
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTED,
      });
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.IDLE,
      });
    },
  );

  await useCase.start(SESSION_PLATFORMS.YOUTUBE);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(
    delivered.map((comments) => comments.map((comment) => comment.id)),
    [["1"]],
  );
  assert.deepEqual(published, [
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.CONNECTING },
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.CONNECTED },
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.IDLE },
  ]);
  assert.deepEqual(useCase.getSessions()[SESSION_PLATFORMS.YOUTUBE], {
    platform: SESSION_PLATFORMS.YOUTUBE,
    state: SESSION_STATES.IDLE,
  });
});

test("stop は実行中 runner を abort して idle を通知する", async () => {
  let capturedSignal: AbortSignal | undefined;
  const { useCase, published } = createUseCase(
    async (_options, _outputPort, controls) => {
      capturedSignal = controls.signal;
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTING,
      });
      await new Promise<void>((resolve) => {
        controls.signal?.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.IDLE,
      });
    },
  );

  await useCase.start(SESSION_PLATFORMS.YOUTUBE);
  await new Promise<void>((resolve) => setImmediate(resolve));
  await useCase.stop(SESSION_PLATFORMS.YOUTUBE);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(capturedSignal?.aborted, true);
  assert.deepEqual(published, [
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.CONNECTING },
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.IDLE },
  ]);
});

test("failed は通知後に idle へ自動リセットされる", async () => {
  const { useCase, published } = createUseCase(
    async (_options, _outputPort, controls) => {
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.FAILED,
        reason: "not found",
      });
    },
    async () => {},
    0,
  );

  await useCase.start(SESSION_PLATFORMS.YOUTUBE);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(published, [
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.CONNECTING },
    {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.FAILED,
      reason: "not found",
    },
    { platform: SESSION_PLATFORMS.YOUTUBE, state: SESSION_STATES.IDLE },
  ]);
});

test("プラットフォームごとに独立した状態を保持する", async () => {
  const { useCase } = createUseCase(
    async (_options, _outputPort, controls) => {
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTED,
      });
    },
    async (_options, _outputPort, controls) => {
      await controls.onStateChange?.({
        platform: SESSION_PLATFORMS.TWITCH,
        state: SESSION_STATES.CONNECTING,
      });
    },
  );

  await useCase.start(SESSION_PLATFORMS.YOUTUBE);
  await useCase.start(SESSION_PLATFORMS.TWITCH);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(useCase.getSessions(), {
    [SESSION_PLATFORMS.YOUTUBE]: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.CONNECTED,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      platform: SESSION_PLATFORMS.TWITCH,
      state: SESSION_STATES.CONNECTING,
    },
  });
});
