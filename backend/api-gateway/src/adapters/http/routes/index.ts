import { Hono } from "hono";
import type { ManageStreamingSessionsUseCase } from "../../../usecases/manage-streaming-sessions.usecase.js";
import { createSessionsRouter } from "./sessions/index.js";

export const createHttpRoutes = (
  manageStreamingSessionsUseCase: ManageStreamingSessionsUseCase,
): Hono => {
  const app = new Hono();

  app.route("/sessions", createSessionsRouter(manageStreamingSessionsUseCase));
  // /auth/... は routes/auth/index.ts を追加してここに mount する。

  return app;
};

export { createSessionsRouter } from "./sessions/index.js";
