import { injectable } from "tsyringe";

export type WebSocketEndpoint = {
  host: string;
  port: number;
};

export interface WebSocketConfigProvider {
  getEndpoint(): WebSocketEndpoint;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 17331;

@injectable()
export class EnvWebSocketConfigProvider implements WebSocketConfigProvider {
  getEndpoint(): WebSocketEndpoint {
    const host = process.env.COMMENT_DELIVERY_WS_HOST ?? DEFAULT_HOST;
    const rawPort = process.env.COMMENT_DELIVERY_WS_PORT;
    const parsedPort = rawPort ? Number(rawPort) : DEFAULT_PORT;

    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      throw new Error(
        `[comment-delivery] invalid COMMENT_DELIVERY_WS_PORT: ${String(rawPort)}`,
      );
    }

    return { host, port: parsedPort };
  }
}
