import { Hono } from "hono";
import { z } from "zod";
import type { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import type { Comment } from "@comment-dock/comment-fetcher";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const monetaryAmountSchema = z.object({
  currency: z.string(),
  amount: z.number(),
});

const commentSchema = z.object({
  id: z.string(),
  source: z.enum(["youtube", "twitch"]),
  author: userSchema,
  text: z.string(),
  publishedAt: z.coerce.date(),
  eventType: z.enum(["normal", "super_chat", "subscription"]),
  monetaryAmount: monetaryAmountSchema.optional(),
});

const requestBodySchema = z.object({
  comments: z.array(commentSchema),
});

export const createTestCommentsRouter = (
  deliverCommentsUseCase: DeliverCommentsUseCase,
): Hono => {
  const app = new Hono();

  app.post("/comments", async (context) => {
    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      return context.json({ error: "リクエストボディが不正です。" }, 400);
    }

    const parseResult = requestBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return context.json({ error: parseResult.error.message }, 400);
    }

    const comments = parseResult.data.comments as Comment[];

    if (comments.length > 0) {
      await deliverCommentsUseCase.deliverComments(comments);
    }

    return context.json({ accepted: comments.length });
  });

  return app;
};
