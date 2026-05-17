import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  type AccountLinkSnapshot,
  type AccountLinkStateMessage,
  type CommentDeliveryMessage,
  type CommentsAppendMessage,
  type CommentsBatchMessage,
  type CommentViewDto,
  type SessionStateMessage,
  type StreamingSessionSnapshot,
} from "@comment-dock/shared";
import { upsertLiveSession } from "../../../entities/live-session/api/live-sessions.repository";
import type { DbPlatform } from "../../../entities/live-session/model/types";
import { API_GATEWAY_WS_URL } from "../config/ws";
import {
  toDbPlatform,
  toQueuedCommentWrite,
} from "../lib/converters/comment-delivery-ws.converter";
import { CommentWriteQueue } from "./comment-write-queue";

const COMMENTS_APPEND = COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND;
const COMMENTS_BATCH = COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_BATCH;
const SESSION_STATE = COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE;
const ACCOUNT_LINK_STATE = COMMENT_DELIVERY_MESSAGE_TYPES.ACCOUNT_LINK_STATE;

type CommentDeliveryCommentMessage =
  | CommentsAppendMessage
  | CommentsBatchMessage;

type SupportedCommentDeliveryMessage =
  | CommentDeliveryCommentMessage
  | SessionStateMessage
  | AccountLinkStateMessage;

export type CommentDeliveryWsClientOptions = {
  wsUrl?: string;
  queueIntervalMs?: number;
  onSessionState?: (session: StreamingSessionSnapshot) => void;
  onAccountState?: (account: AccountLinkSnapshot) => void;
};

export type CommentIngestionRuntime = {
  start: () => void;
  stop: (flushRemaining: boolean) => Promise<void>;
};

function parseMessage(raw: string): SupportedCommentDeliveryMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CommentDeliveryMessage>;
    if (
      parsed.type === COMMENTS_APPEND &&
      parsed.payload &&
      "comment" in parsed.payload
    ) {
      return parsed as CommentsAppendMessage;
    }
    if (
      parsed.type === COMMENTS_BATCH &&
      parsed.payload &&
      "comments" in parsed.payload
    ) {
      return parsed as CommentsBatchMessage;
    }
    if (
      parsed.type === SESSION_STATE &&
      parsed.payload &&
      "platform" in parsed.payload &&
      "state" in parsed.payload
    ) {
      return parsed as SessionStateMessage;
    }
    if (
      parsed.type === ACCOUNT_LINK_STATE &&
      parsed.payload &&
      "provider" in parsed.payload &&
      "state" in parsed.payload
    ) {
      return parsed as AccountLinkStateMessage;
    }
    return null;
  } catch {
    return null;
  }
}

class CommentDeliveryWsClient implements CommentIngestionRuntime {
  private readonly queue: CommentWriteQueue;
  private readonly wsUrl: string;
  private readonly onSessionState?: (session: StreamingSessionSnapshot) => void;
  private readonly onAccountState?: (account: AccountLinkSnapshot) => void;
  private readonly liveSessionIdByPlatform = new Map<DbPlatform, number>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor(options: CommentDeliveryWsClientOptions = {}) {
    this.wsUrl = options.wsUrl ?? API_GATEWAY_WS_URL;
    this.onSessionState = options.onSessionState;
    this.onAccountState = options.onAccountState;
    this.queue = new CommentWriteQueue({
      intervalMs: options.queueIntervalMs ?? 1000,
    });
  }

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
    const socket = new WebSocket(this.wsUrl);
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

    if (message.type === SESSION_STATE) {
      this.onSessionState?.(message.payload);
      return;
    }

    if (message.type === ACCOUNT_LINK_STATE) {
      this.onAccountState?.(message.payload);
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

export function createCommentIngestionRuntime(
  options: CommentDeliveryWsClientOptions = {},
): CommentIngestionRuntime {
  return new CommentDeliveryWsClient(options);
}
