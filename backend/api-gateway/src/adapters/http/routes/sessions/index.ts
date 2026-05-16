import { SESSION_PLATFORMS, type SessionPlatform } from "@comment-dock/shared";
import type { PipelineRunOptions } from "@comment-dock/comment-fetcher";
import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ManageStreamingSessionsUseCase } from "../../../../usecases/manage-streaming-sessions.usecase.js";
import { readOptionalJsonObjectBody } from "../../request-body.js";

const SESSION_PLATFORM_VALUES = new Set<string>([
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
]);

export const createSessionsRouter = (
  manageStreamingSessionsUseCase: ManageStreamingSessionsUseCase,
): Hono => {
  const app = new Hono();

  app.get("/", (context) =>
    context.json({
      sessions: manageStreamingSessionsUseCase.getSessions(),
    }),
  );

  app.post("/:platform/start", async (context) => {
    const platform = parsePlatform(context.req.param("platform"));
    const session = await manageStreamingSessionsUseCase.start(
      platform,
      await parsePipelineRunOptions(context),
    );

    return context.json({ session });
  });

  app.post("/:platform/stop", async (context) => {
    const platform = parsePlatform(context.req.param("platform"));
    const session = await manageStreamingSessionsUseCase.stop(platform);

    return context.json({ session });
  });

  return app;
};

const parsePlatform = (value: string | undefined): SessionPlatform => {
  if (value && SESSION_PLATFORM_VALUES.has(value)) {
    return value as SessionPlatform;
  }

  throw new HTTPException(400, {
    message: `Unsupported session platform: ${String(value)}`,
  });
};

const parsePipelineRunOptions = async (
  context: Context,
): Promise<PipelineRunOptions> => {
  const body = await readOptionalJsonObjectBody(context);
  return body as PipelineRunOptions;
};
