import type { DbPlatform } from "../types";
import { CommentWriteQueue } from "../queue/comment-write-queue";
import { upsertLiveSession } from "../repositories/liveSessions.repository";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  type CommentDeliveryMessage,
  type CommentViewDto,
} from "@comment-dock/shared";
import {
  toDbPlatform,
  toQueuedCommentWrite,
} from "../converters/comment-delivery-ws.converter";

const COMMENT_DELIVERY_WS_URL =
  import.meta.env.VITE_COMMENT_DELIVERY_WS_URL ?? "ws://127.0.0.1:17331";
const COMMENTS_APPEND = COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND;
const COMMENTS_BATCH = COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_BATCH;

function parseMessage(raw: string): CommentDeliveryMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CommentDeliveryMessage>;
    if (
      parsed.type === COMMENTS_APPEND &&
      parsed.payload &&
      "comment" in parsed.payload
    ) {
      return parsed as CommentDeliveryMessage;
    }
    if (
      parsed.type === COMMENTS_BATCH &&
      parsed.payload &&
      "comments" in parsed.payload
    ) {
      return parsed as CommentDeliveryMessage;
    }
    return null;
  } catch {
    return null;
  }
}

export class CommentDeliveryWsQueueWriter {
  private readonly queue = new CommentWriteQueue({ intervalMs: 1000 });
  private readonly liveSessionIdByPlatform = new Map<DbPlatform, number>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.queue.start();
    this.connect();
  }

  async stop(flushRemaining: boolean): Promise<void> {
    this.started = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    await this.queue.stop(flushRemaining);
  }

  private connect(): void {
    const socket = new WebSocket(COMMENT_DELIVERY_WS_URL);
    this.socket = socket;

    socket.onmessage = (event) => {
      void this.handleMessage(event.data);
    };

    socket.onclose = () => {
      this.socket = null;
      if (!this.started) {
        return;
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1500);
    };
  }

  private async handleMessage(rawData: unknown): Promise<void> {
    if (typeof rawData !== "string") {
      return;
    }
    const message = parseMessage(rawData);
    if (!message) {
      return;
    }

    if (message.type === COMMENTS_APPEND) {
      await this.enqueueOne(message.payload.comment);
      return;
    }

    for (const comment of message.payload.comments) {
      await this.enqueueOne(comment);
    }
  }

  private async enqueueOne(comment: CommentViewDto): Promise<void> {
    const platform = toDbPlatform(comment.source);
    if (!platform) {
      return;
    }
    const liveSessionId = await this.getOrCreateLiveSessionId(platform);
    const queued = toQueuedCommentWrite(comment, liveSessionId);
    if (!queued) {
      return;
    }
    this.queue.enqueue(queued);
  }

  private async getOrCreateLiveSessionId(
    platform: DbPlatform,
  ): Promise<number> {
    const existing = this.liveSessionIdByPlatform.get(platform);
    if (existing !== undefined) {
      return existing;
    }

    const created = await upsertLiveSession({
      platform,
      // desktop が再起動しても同一配信を同じセッションとして扱うため、
      // backend から実ライブIDを受け取るまでは platform ごとに固定キーを使う。
      platformLiveId: `ws-session-${platform}`,
    });
    this.liveSessionIdByPlatform.set(platform, created);
    return created;
  }
}

export const commentDeliveryWsQueueWriter = new CommentDeliveryWsQueueWriter();
