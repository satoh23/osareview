import { inject, injectable } from "tsyringe";
import {
  SESSION_PLATFORMS,
  SESSION_STATES,
  type SessionPlatform,
  type StreamingSessionSnapshot,
  type StreamingSessionSnapshots,
} from "@comment-dock/shared";
import {
  runTwitchPipeline,
  runYouTubePipeline,
  type CommentOutputPort,
  type PipelineControlOptions,
  type PipelineRunOptions,
} from "@comment-dock/comment-fetcher";
import { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import { API_GATEWAY_DI_TOKENS } from "../infrastructure/shared/di-tokens.js";
import type {
  SessionStateOutputEvent,
  SessionStateOutputPort,
} from "./session-state-output-port.interface.js";

export type SessionPipelineRunner = (
  options: PipelineRunOptions,
  outputPort: CommentOutputPort,
  controls: PipelineControlOptions,
) => Promise<void>;

type SessionSlot = StreamingSessionSnapshot & {
  controller?: AbortController;
  failedResetTimer?: ReturnType<typeof setTimeout>;
  runId: number;
};

const SESSION_PLATFORMS_LIST = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const;

const DEFAULT_FAILED_RESET_DELAY_MS = 3000;

@injectable()
export class ManageStreamingSessionsUseCase {
  // NOTE: runner は非同期に状態通知を返すため、stop -> start の直後などに
  // 古い実行から遅れて届いた通知を無視できるよう実行世代を採番している。
  private nextRunId = 0;

  private readonly sessions: Record<SessionPlatform, SessionSlot> = {
    [SESSION_PLATFORMS.YOUTUBE]: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.IDLE,
      runId: 0,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      platform: SESSION_PLATFORMS.TWITCH,
      state: SESSION_STATES.IDLE,
      runId: 0,
    },
  };

  constructor(
    @inject(DeliverCommentsUseCase)
    private readonly deliverCommentsUseCase: DeliverCommentsUseCase,
    @inject(API_GATEWAY_DI_TOKENS.sessionStateOutputPort)
    private readonly sessionStateOutputPort: SessionStateOutputPort,
    @inject(API_GATEWAY_DI_TOKENS.youtubePipelineRunner)
    private readonly youtubePipelineRunner: SessionPipelineRunner = runYouTubePipeline,
    @inject(API_GATEWAY_DI_TOKENS.twitchPipelineRunner)
    private readonly twitchPipelineRunner: SessionPipelineRunner = runTwitchPipeline,
    @inject(API_GATEWAY_DI_TOKENS.failedSessionResetDelayMs)
    private readonly failedResetDelayMs = DEFAULT_FAILED_RESET_DELAY_MS,
  ) {}

  /**
   * 指定 platform のコメント取得パイプラインを開始する。
   *
   * start は runner の完了を待たず、起動直後のセッション状態を返す。
   * 以降の connected / failed / idle などの状態変化は runner の
   * onStateChange から非同期に反映される。
   */
  async start(
    platform: SessionPlatform,
    options: PipelineRunOptions = {},
  ): Promise<StreamingSessionSnapshot> {
    const session = this.getSlot(platform);
    if (session.controller && !session.controller.signal.aborted) {
      return this.toSnapshot(session);
    }

    this.clearFailedResetTimer(session);

    const controller = new AbortController();
    const runId = this.nextRunId + 1;
    this.nextRunId = runId;
    session.controller = controller;
    session.runId = runId;
    await this.updateSessionState({
      platform,
      state: SESSION_STATES.CONNECTING,
    });

    const outputPort: CommentOutputPort = {
      outputComments: async (comments) => {
        await this.deliverCommentsUseCase.deliverComments(comments);
      },
    };
    const controls: PipelineControlOptions = {
      signal: controller.signal,
      onStateChange: async (event) => {
        // stop -> start 直後などに古い runner から届いた状態通知は無視する。
        if (session.runId !== runId) {
          return;
        }
        await this.updateSessionState(event);
      },
    };

    // runner はバックグラウンドで継続実行し、取得コメントは delivery へ直結する。
    // ここで await すると HTTP start API などの呼び出し元が配信終了まで戻れない。
    this.getRunner(platform)(options, outputPort, controls)
      .catch(async (error: unknown) => {
        if (session.runId !== runId || controller.signal.aborted) {
          return;
        }
        await this.updateSessionState({
          platform,
          state: SESSION_STATES.FAILED,
          reason: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        // 同じ実行世代の終了だけ controller を片付ける。
        // 新しい start 済みなら、その controller を消さない。
        if (session.runId === runId) {
          session.controller = undefined;
        }
      });

    return this.toSnapshot(session);
  }

  /**
   * 指定 platform の実行中パイプラインを停止し、セッション状態を idle に戻す。
   *
   * stop 後に古い runner から遅れて状態通知が届いても現在状態を壊さないよう、
   * abort 前に runId を進めてその通知を無視できる状態にしている。
   */
  async stop(platform: SessionPlatform): Promise<StreamingSessionSnapshot> {
    const session = this.getSlot(platform);
    this.clearFailedResetTimer(session);

    // 実行世代を進め、停止対象 runner から今後届く状態通知を無効化する。
    session.runId += 1;

    session.controller?.abort();
    session.controller = undefined;

    // 停止操作は失敗ではなく明示的な終了なので idle として通知する。
    await this.updateSessionState({
      platform,
      state: SESSION_STATES.IDLE,
    });

    return this.toSnapshot(session);
  }

  getSessions(): StreamingSessionSnapshots {
    return Object.fromEntries(
      SESSION_PLATFORMS_LIST.map((platform) => [
        platform,
        this.toSnapshot(this.getSlot(platform)),
      ]),
    ) as StreamingSessionSnapshots;
  }

  private getSlot(platform: SessionPlatform): SessionSlot {
    return this.sessions[platform];
  }

  private getRunner(platform: SessionPlatform): SessionPipelineRunner {
    switch (platform) {
      case SESSION_PLATFORMS.YOUTUBE:
        return this.youtubePipelineRunner;
      case SESSION_PLATFORMS.TWITCH:
        return this.twitchPipelineRunner;
    }
  }

  private async updateSessionState(
    event: SessionStateOutputEvent,
  ): Promise<void> {
    const session = this.getSlot(event.platform);
    const nextSnapshot: StreamingSessionSnapshot = {
      platform: event.platform,
      state: event.state,
      ...(event.reason ? { reason: event.reason } : {}),
    };
    const currentSnapshot = this.toSnapshot(session);

    if (
      currentSnapshot.state === nextSnapshot.state &&
      currentSnapshot.reason === nextSnapshot.reason
    ) {
      return;
    }

    session.state = nextSnapshot.state;
    session.reason = nextSnapshot.reason;
    await this.sessionStateOutputPort.publishSessionState(nextSnapshot);

    if (nextSnapshot.state === SESSION_STATES.FAILED) {
      this.scheduleFailedReset(session);
      return;
    }

    this.clearFailedResetTimer(session);
  }

  /**
   * failed 状態を短時間だけ表示したあと、自動的に idle へ戻す timer を予約する。
   *
   * timer 発火前に再 start / stop された場合、古い timer が新しい実行状態を
   * 上書きしないよう、予約時点の runId と現在の runId を比較している。
   */
  private scheduleFailedReset(session: SessionSlot): void {
    this.clearFailedResetTimer(session);
    const scheduledRunId = session.runId;
    session.failedResetTimer = setTimeout(() => {
      if (
        session.runId !== scheduledRunId ||
        session.state !== SESSION_STATES.FAILED
      ) {
        return;
      }
      void this.updateSessionState({
        platform: session.platform,
        state: SESSION_STATES.IDLE,
      });
    }, this.failedResetDelayMs);
  }

  private clearFailedResetTimer(session: SessionSlot): void {
    if (!session.failedResetTimer) {
      return;
    }
    clearTimeout(session.failedResetTimer);
    session.failedResetTimer = undefined;
  }

  private toSnapshot(session: SessionSlot): StreamingSessionSnapshot {
    return {
      platform: session.platform,
      state: session.state,
      ...(session.reason ? { reason: session.reason } : {}),
    };
  }
}
