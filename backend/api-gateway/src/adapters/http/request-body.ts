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
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HTTPException(400, {
      message: "Request body must be a JSON object",
    });
  }

  return body as Record<string, unknown>;
};

const hasRequestBody = (context: Context): boolean => {
  const contentLength = context.req.header("content-length");
  return contentLength !== undefined && contentLength !== "0";
};
