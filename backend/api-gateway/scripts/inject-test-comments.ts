import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentEventType,
  type CommentSource,
} from "@comment-dock/shared";
import type { Comment } from "@comment-dock/comment-fetcher";

type Options = {
  host: string;
  port: number;
  path: string;
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
    port: parseIntOption(args.get("port"), 17332),
    path: args.get("path") ?? "/test/comments",
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

function makeComment(index: number, options: Options): Comment {
  const source = pickByIndex(options.sources, index);
  const eventType = pickByIndex(options.eventTypes, index);
  const idPrefix = source === COMMENT_SOURCES.YOUTUBE ? "yt" : "tw";

  return {
    id: `${idPrefix}-${index}`,
    source,
    author: {
      id: `${source}-user-${index % 20}`,
      name: `${source}-tester-${index % 20}`,
    },
    text: `[mock:${source}] #${index} ${eventType}`,
    publishedAt: new Date(),
    eventType,
    monetaryAmount:
      eventType === COMMENT_EVENT_TYPES.SUPER_CHAT
        ? { currency: "JPY", amount: 100 + (index % 10) * 50 }
        : undefined,
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const url = `http://${options.host}:${options.port}${options.path}`;

  console.info("[inject-test-comments] starting", {
    url,
    mps: options.mps,
    batchSize: options.batchSize,
    maxMessages: options.maxMessages,
    sources: options.sources.join(","),
    eventTypes: options.eventTypes.join(","),
  });

  let sent = 0;
  const intervalMs = Math.max(1, Math.floor(1000 / options.mps));

  const timer = setInterval(() => {
    const comments: Comment[] = [];
    for (let i = 0; i < options.batchSize; i += 1) {
      comments.push(makeComment(sent + i, options));
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "(no body)");
          console.warn(
            "[inject-test-comments] サーバーがエラーを返しました。",
            {
              status: response.status,
              body: text,
            },
          );
        }
      })
      .catch((error: unknown) => {
        console.warn(
          "[inject-test-comments] リクエストに失敗しました。",
          error,
        );
      });

    sent += options.batchSize;

    if (sent % Math.max(100, options.batchSize) === 0) {
      console.info("[inject-test-comments] progress", { sent });
    }

    if (sent >= options.maxMessages) {
      clearInterval(timer);
      console.info("[inject-test-comments] completed", { sent });
    }
  }, intervalMs);
}

void main().catch((error: unknown) => {
  console.error("[inject-test-comments] 致命的なエラーが発生しました。", error);
  process.exitCode = 1;
});
