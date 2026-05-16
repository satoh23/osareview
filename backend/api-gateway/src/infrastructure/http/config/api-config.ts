import { readPort } from "../../shared/config/port.js";

export type HttpApiEndpoint = {
  host: string;
  port: number;
};

const DEFAULT_HTTP_HOST = "127.0.0.1";
const DEFAULT_HTTP_PORT = 17332;

export const getHttpApiEndpoint = (): HttpApiEndpoint => ({
  host: process.env.API_GATEWAY_HTTP_HOST ?? DEFAULT_HTTP_HOST,
  port: readPort("API_GATEWAY_HTTP_PORT", DEFAULT_HTTP_PORT),
});
