import { withImmediateTransaction } from "../../shared/api/sqlite";
import { persistQueuedCommentWrite } from "../usecases/persist-queued-comment-write";
import type { QueuedCommentWrite } from "../types";

export type { QueuedCommentWrite } from "../types";

export type CommentWriteQueueOptions = {
  intervalMs?: number;
};

export class CommentWriteQueue {
  private readonly queue: QueuedCommentWrite[] = [];
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushPromise: Promise<number> | null = null;

  constructor(options: CommentWriteQueueOptions = {}) {
    this.intervalMs = options.intervalMs ?? 1000;
  }

  enqueue(item: QueuedCommentWrite): void {
    this.queue.push(item);
  }

  size(): number {
    return this.queue.length;
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, this.intervalMs);
  }

  async stop(flushRemaining = false): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (flushRemaining) {
      await this.flush();
    }
  }

  async flush(): Promise<number> {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  private async flushInternal(): Promise<number> {
    if (this.queue.length === 0) {
      return 0;
    }

    const batch = this.queue.splice(0, this.queue.length);
    try {
      await withImmediateTransaction(async () => {
        for (const item of batch) {
          await persistQueuedCommentWrite(item);
        }
      });
      return batch.length;
    } catch (error) {
      this.queue.unshift(...batch);
      throw error;
    }
  }
}
