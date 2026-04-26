import { setTimeout as sleep } from "node:timers/promises";
import type {
  FindLiveStreamInput,
  FindLiveStreamResult,
  LiveStreamRepository,
} from "./live-stream-repository.interface.js";
import {
  DEFAULT_LIVE_STREAM_MAX_ATTEMPTS,
  DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
} from "../../infrastructure/config/live-stream-detection.js";

type WaitFn = (milliseconds: number) => Promise<void>;

export class LiveStreamNotFoundError extends Error {
  constructor(channelId: string, maxAttempts: number) {
    super(
      `Live stream was not found for channel "${channelId}" after ${maxAttempts} attempts.`,
    );
    this.name = "LiveStreamNotFoundError";
  }
}

export class DetectLiveStreamUseCase {
  constructor(
    private readonly repository: LiveStreamRepository,
    private readonly pollingIntervalMs = DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
    private readonly maxAttempts = DEFAULT_LIVE_STREAM_MAX_ATTEMPTS,
    // テスト時に待機処理を差し替えて高速・安定に検証できるよう注入可能にしている。
    private readonly wait: WaitFn = async (milliseconds) => {
      await sleep(milliseconds);
    },
  ) {}

  async findActiveLiveStream(
    input: FindLiveStreamInput,
  ): Promise<FindLiveStreamResult> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.repository.findLiveStream(input);
      if (result) return result;

      if (attempt < this.maxAttempts) await this.wait(this.pollingIntervalMs);
    }

    throw new LiveStreamNotFoundError(input.channelId, this.maxAttempts);
  }
}
