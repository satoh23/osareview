import {
  SESSION_PLATFORMS,
  type AccountLinkProvider,
} from "@comment-dock/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ManageAccountLinksUseCase } from "../../../../usecases/manage-account-links.usecase.js";

const ACCOUNT_LINK_PROVIDER_VALUES = new Set<string>([
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
]);

export const createAccountsRouter = (
  manageAccountLinksUseCase: ManageAccountLinksUseCase,
): Hono => {
  const app = new Hono();

  app.get("/", (context) => {
    return context.json({
      accounts: manageAccountLinksUseCase.getSnapshot(),
    });
  });

  app.post("/:provider/link", async (context) => {
    const provider = parseProvider(context.req.param("provider"));
    const account = await manageAccountLinksUseCase.link(provider);

    return context.json({ account });
  });

  app.post("/:provider/unlink", async (context) => {
    const provider = parseProvider(context.req.param("provider"));
    const account = await manageAccountLinksUseCase.unlink(provider);

    return context.json({ account });
  });

  return app;
};

const parseProvider = (value: string | undefined): AccountLinkProvider => {
  if (value && ACCOUNT_LINK_PROVIDER_VALUES.has(value)) {
    return value as AccountLinkProvider;
  }

  throw new HTTPException(400, {
    message: `対応していないアカウント連携先です: ${String(value)}`,
  });
};
