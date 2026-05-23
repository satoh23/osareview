import { Hono } from "hono";
import type { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import type { ManageAccountLinksUseCase } from "../../../usecases/manage-account-links.usecase.js";
import type { ManageStreamingSessionsUseCase } from "../../../usecases/manage-streaming-sessions.usecase.js";
import { createAccountsRouter } from "./accounts/index.js";
import { createSessionsRouter } from "./sessions/index.js";
import { createTestCommentsRouter } from "./test/index.js";

export const createHttpRoutes = (
  manageStreamingSessionsUseCase: ManageStreamingSessionsUseCase,
  manageAccountLinksUseCase: ManageAccountLinksUseCase,
  deliverCommentsUseCase: DeliverCommentsUseCase,
  testInjectEnabled: boolean,
): Hono => {
  const app = new Hono();

  app.route("/sessions", createSessionsRouter(manageStreamingSessionsUseCase));
  app.route("/accounts", createAccountsRouter(manageAccountLinksUseCase));
  // /auth/... は routes/auth/index.ts を追加してここに mount する。

  if (testInjectEnabled) {
    app.route("/test", createTestCommentsRouter(deliverCommentsUseCase));
  }

  return app;
};

export { createAccountsRouter } from "./accounts/index.js";
export { createSessionsRouter } from "./sessions/index.js";
