import type {
  SessionPlatform,
  SessionState,
  StreamingSessionResponse,
  StreamingSessionSnapshot,
  StreamingSessionSnapshots,
  StreamingSessionsResponse,
} from "@comment-dock/shared";
import { apiGatewayHttpClient, type ApiGatewayHttpClient } from "./http-client";

export type StreamingSessionClient = {
  getSessionStates: () => Promise<StreamingSessionSnapshots>;
  startSession: (
    platform: SessionPlatform,
  ) => Promise<StreamingSessionSnapshot>;
  stopSession: (platform: SessionPlatform) => Promise<StreamingSessionSnapshot>;
};

/**
 * api-gateway の配信セッション制御 API を呼ぶ client を生成する。
 *
 * 目的:
 * - UI / feature から HTTP の path やレスポンス形状を直接扱わずに済むよう、
 *   配信セッション操作を `getSessionStates` / `startSession` / `stopSession`
 *   という用途単位の関数へ閉じ込める。
 *
 * 処理:
 * - `GET /sessions` で YouTube / Twitch の現在状態を取得する。
 * - `POST /sessions/:platform/start` で対象 platform の取得を開始する。
 * - `POST /sessions/:platform/stop` で対象 platform の取得を停止する。
 * - api-gateway の JSON レスポンスを shared の契約型として検証して返す。
 */
export const createStreamingSessionClient = (
  httpClient: ApiGatewayHttpClient = apiGatewayHttpClient,
): StreamingSessionClient => ({
  async getSessionStates(): Promise<StreamingSessionSnapshots> {
    const response = await httpClient.requestJson<unknown>("/sessions");
    return parseSessionsResponse(response).sessions;
  },

  async startSession(
    platform: SessionPlatform,
  ): Promise<StreamingSessionSnapshot> {
    const response = await httpClient.requestJson<unknown>(
      `/sessions/${platform}/start`,
      { method: "POST" },
    );
    return parseSessionResponse(response).session;
  },

  async stopSession(
    platform: SessionPlatform,
  ): Promise<StreamingSessionSnapshot> {
    const response = await httpClient.requestJson<unknown>(
      `/sessions/${platform}/stop`,
      { method: "POST" },
    );
    return parseSessionResponse(response).session;
  },
});

export const streamingSessionClient = createStreamingSessionClient();

// NOTE: 画面側で `startSession("youtube")` のように直接 import して使える
// 既定 client のショートカット。bind はメソッドを単体関数として渡しても
// 呼び出しコンテキストが壊れないようにするための安全策。
export const getSessionStates = streamingSessionClient.getSessionStates.bind(
  streamingSessionClient,
);
export const startSession = streamingSessionClient.startSession.bind(
  streamingSessionClient,
);
export const stopSession = streamingSessionClient.stopSession.bind(
  streamingSessionClient,
);

const parseSessionResponse = (value: unknown): StreamingSessionResponse => {
  if (!isJsonObject(value) || !isSessionSnapshot(value.session)) {
    throw new Error("Invalid session response from API Gateway");
  }
  return { session: value.session };
};

const parseSessionsResponse = (value: unknown): StreamingSessionsResponse => {
  if (!isJsonObject(value) || !isJsonObject(value.sessions)) {
    throw new Error("Invalid sessions response from API Gateway");
  }

  const youtube = value.sessions.youtube;
  const twitch = value.sessions.twitch;
  if (!isSessionSnapshot(youtube) || !isSessionSnapshot(twitch)) {
    throw new Error("Invalid sessions response from API Gateway");
  }

  return {
    sessions: {
      youtube,
      twitch,
    },
  };
};

const isSessionSnapshot = (value: unknown): value is StreamingSessionSnapshot =>
  isJsonObject(value) &&
  (value.platform === "youtube" || value.platform === "twitch") &&
  isSessionState(value.state) &&
  (value.reason === undefined || typeof value.reason === "string");

const isSessionState = (value: unknown): value is SessionState =>
  value === "idle" ||
  value === "connecting" ||
  value === "connected" ||
  value === "failed";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
