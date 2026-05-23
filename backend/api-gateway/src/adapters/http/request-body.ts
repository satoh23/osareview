import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const readOptionalJsonObjectBody = async (
  context: Context,
): Promise<Record<string, unknown>> => {
  if (!hasRequestBody(context)) {
    return {};
  }

  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new HTTPException(400, {
      message: "リクエスト本文の JSON を読み取れませんでした。",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HTTPException(400, {
      message: "リクエスト本文は JSON オブジェクトで送信してください。",
    });
  }

  return body as Record<string, unknown>;
};

const hasRequestBody = (context: Context): boolean => {
  const contentLength = context.req.header("content-length");
  return contentLength !== undefined && contentLength !== "0";
};
