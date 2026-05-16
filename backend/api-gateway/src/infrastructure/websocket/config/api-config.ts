import { readPort } from "../../shared/config/port.js";

export type WebSocketApiEndpoint = {
  host: string;
  port: number;
};

const DEFAULT_WS_HOST = "127.0.0.1";
const DEFAULT_WS_PORT = 17331;

export const getWebSocketApiEndpoint = (): WebSocketApiEndpoint => ({
  host: process.env.API_GATEWAY_WS_HOST ?? DEFAULT_WS_HOST,
  port: readPort("API_GATEWAY_WS_PORT", DEFAULT_WS_PORT),
});
