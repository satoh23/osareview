import { WebSocket, WebSocketServer } from "ws";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentDeliveryMessage,
  type CommentEventType,
  type CommentSource,
  type CommentViewDto,
} from "@comment-dock/shared";

type Options = {
  host: string;
  port: number;
  mps: number;
  batchSize: number;
  maxMessages: number;
  sources: CommentSource[];
  eventTypes: CommentEventType[];
};

function parseIntOption(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseListOption<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
): T[] {
  if (!raw) return [...fallback];
  const inputSet = new Set(raw.split(",").map((item) => item.trim()));
  const values = allowed.filter((item) => inputSet.has(item));
  return values.length > 0 ? values : [...fallback];
}

function parseOptions(argv: readonly string[]): Options {
  const args = new Map<string, string>();
  for (const chunk of argv) {
    if (!chunk.startsWith("--")) continue;
    const [key, value] = chunk.slice(2).split("=");
    if (!key || value === undefined) continue;
    args.set(key, value);
  }

  return {
    host: args.get("host") ?? "127.0.0.1",
    port: parseIntOption(args.get("port"), 17340),
    mps: parseIntOption(args.get("mps"), 50),
    batchSize: parseIntOption(args.get("batch"), 1),
    maxMessages: parseIntOption(args.get("max"), 5000),
    sources: parseListOption(
      args.get("sources"),
      [COMMENT_SOURCES.YOUTUBE, COMMENT_SOURCES.TWITCH],
      [COMMENT_SOURCES.YOUTUBE, COMMENT_SOURCES.TWITCH],
    ),
    eventTypes: parseListOption(
      args.get("events"),
      [
        COMMENT_EVENT_TYPES.NORMAL,
        COMMENT_EVENT_TYPES.SUPER_CHAT,
        COMMENT_EVENT_TYPES.SUBSCRIPTION,
      ],
      [
        COMMENT_EVENT_TYPES.NORMAL,
        COMMENT_EVENT_TYPES.SUPER_CHAT,
        COMMENT_EVENT_TYPES.SUBSCRIPTION,
      ],
    ),
  };
}

function pickByIndex<T>(values: readonly T[], index: number): T {
  return values[index % values.length] as T;
}

function makeComment(index: number, options: Options): CommentViewDto {
  const source = pickByIndex(options.sources, index);
  const eventType = pickByIndex(options.eventTypes, index);
  const now = new Date().toISOString();
  const idPrefix = source === COMMENT_SOURCES.YOUTUBE ? "yt" : "tw";

  return {
    id: `${idPrefix}-${index}`,
    source,
    author: {
      id: `${source}-user-${index % 20}`,
      name: `${source}-tester-${index % 20}`,
    },
    text: `[mock:${source}] #${index} ${eventType}`,
    publishedAt: now,
    eventType,
    monetaryAmount:
      eventType === COMMENT_EVENT_TYPES.SUPER_CHAT
        ? { currency: "JPY", amount: 100 + (index % 10) * 50 }
        : undefined,
  };
}

function buildMessage(
  startIndex: number,
  options: Options,
): CommentDeliveryMessage {
  if (options.batchSize <= 1) {
    return {
      type: COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND,
      payload: { comment: makeComment(startIndex, options) },
    };
  }

  const comments: CommentViewDto[] = [];
  for (let i = 0; i < options.batchSize; i += 1) {
    comments.push(makeComment(startIndex + i, options));
  }
  return {
    type: COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_BATCH,
    payload: { comments },
  };
}

function broadcast(
  server: WebSocketServer,
  message: CommentDeliveryMessage,
): void {
  const encoded = JSON.stringify(message);
  for (const client of server.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(encoded);
    }
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const server = new WebSocketServer({
    host: options.host,
    port: options.port,
  });
  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", (error) => reject(error));
  });

  console.info("[mock-comment-delivery] listening", {
    host: options.host,
    port: options.port,
    mps: options.mps,
    batchSize: options.batchSize,
    maxMessages: options.maxMessages,
    sources: options.sources.join(","),
    eventTypes: options.eventTypes.join(","),
  });

  server.on("connection", () => {
    console.info("[mock-comment-delivery] client connected", {
      clients: server.clients.size,
    });
  });

  let sent = 0;
  const intervalMs = Math.max(1, Math.floor(1000 / options.mps));
  const timer = setInterval(() => {
    if (server.clients.size === 0) {
      return;
    }

    const message = buildMessage(sent, options);
    broadcast(server, message);
    sent += options.batchSize;

    if (sent % Math.max(100, options.batchSize) === 0) {
      console.info("[mock-comment-delivery] progress", { sent });
    }

    if (sent >= options.maxMessages) {
      clearInterval(timer);
      console.info("[mock-comment-delivery] completed", { sent });
    }
  }, intervalMs);
}

void main().catch((error: unknown) => {
  console.error(
    "[mock-comment-delivery] 致命的なエラーが発生しました。",
    error,
  );
  process.exitCode = 1;
});
