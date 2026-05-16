import { container } from "tsyringe";
import { HttpControlServer } from "../adapters/http/server.js";

export const runApiGateway = async (): Promise<void> => {
  const httpControlServer = container.resolve(HttpControlServer);

  await httpControlServer.start();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.info(`[api-gateway] received ${signal}, shutting down`);
    await httpControlServer.close();
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};
