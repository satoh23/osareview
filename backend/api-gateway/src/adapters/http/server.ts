import { inject, injectable } from "tsyringe";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serve, type ServerType } from "@hono/node-server";
import { ManageStreamingSessionsUseCase } from "../../usecases/manage-streaming-sessions.usecase.js";
import {
  getHttpApiEndpoint,
  type HttpApiEndpoint,
} from "../../infrastructure/http/config/api-config.js";
import { createHttpRoutes } from "./routes/index.js";

@injectable()
export class HttpControlServer {
  private server: ServerType | null = null;

  constructor(
    @inject(ManageStreamingSessionsUseCase)
    private readonly manageStreamingSessionsUseCase: ManageStreamingSessionsUseCase,
  ) {}

  async start(endpoint: HttpApiEndpoint = getHttpApiEndpoint()): Promise<void> {
    if (this.server) {
      return;
    }

    const app = new Hono();
    app.route("/", createHttpRoutes(this.manageStreamingSessionsUseCase));
    // /auth/... などのルータは後続でここへ追加する。
    app.notFound((context) => context.json({ error: "Not Found" }, 404));
    app.onError((error, context) => {
      const statusCode = error instanceof HTTPException ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      context.status(statusCode);
      return context.json({ error: message });
    });

    await new Promise<void>((resolve, reject) => {
      const server = serve(
        {
          fetch: app.fetch,
          hostname: endpoint.host,
          port: endpoint.port,
        },
        () => resolve(),
      );
      server.once("error", reject);
      this.server = server;
    });

    console.info("[api-gateway] HTTP control server started", endpoint);
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;

    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
