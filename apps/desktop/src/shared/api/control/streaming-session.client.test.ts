import { describe, expect, it, vi } from "vitest";
import { ApiGatewayHttpError, createApiGatewayHttpClient } from "./http-client";
import { createStreamingSessionClient } from "./streaming-session.client";

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });

describe("createStreamingSessionClient", () => {
  it("GET /sessions で現在のセッション状態を取得する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessions: {
          youtube: { platform: "youtube", state: "idle" },
          twitch: { platform: "twitch", state: "connected" },
        },
      }),
    );
    const client = createStreamingSessionClient(
      createApiGatewayHttpClient({
        baseUrl: "http://127.0.0.1:17332/",
        fetcher,
      }),
    );

    const sessions = await client.getSessionStates();

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:17332/sessions", {
      method: "GET",
      headers: undefined,
      body: undefined,
      signal: undefined,
    });
    expect(sessions).toEqual({
      youtube: { platform: "youtube", state: "idle" },
      twitch: { platform: "twitch", state: "connected" },
    });
  });

  it("POST /sessions/:platform/start で対象セッションを開始する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        session: { platform: "youtube", state: "connecting" },
      }),
    );
    const client = createStreamingSessionClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    const session = await client.startSession("youtube");

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:17332/sessions/youtube/start",
      {
        method: "POST",
        headers: undefined,
        body: undefined,
        signal: undefined,
      },
    );
    expect(session).toEqual({ platform: "youtube", state: "connecting" });
  });

  it("POST /sessions/:platform/stop で対象セッションを停止する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        session: { platform: "twitch", state: "idle" },
      }),
    );
    const client = createStreamingSessionClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    const session = await client.stopSession("twitch");

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:17332/sessions/twitch/stop",
      {
        method: "POST",
        headers: undefined,
        body: undefined,
        signal: undefined,
      },
    );
    expect(session).toEqual({ platform: "twitch", state: "idle" });
  });

  it("Gateway のエラーレスポンスを ApiGatewayHttpError として返す", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "Unsupported session platform: unknown" },
          { status: 400 },
        ),
      );
    const client = createStreamingSessionClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    await expect(client.startSession("youtube")).rejects.toMatchObject({
      name: "ApiGatewayHttpError",
      message: "Unsupported session platform: unknown",
      status: 400,
    } satisfies Partial<ApiGatewayHttpError>);
  });

  it("想定外のレスポンス形状はエラーにする", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessions: {
          youtube: { platform: "youtube", state: "unexpected" },
          twitch: { platform: "twitch", state: "idle" },
        },
      }),
    );
    const client = createStreamingSessionClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    await expect(client.getSessionStates()).rejects.toThrow(
      "コメント接続一覧の応答を読み取れませんでした。少し待ってからもう一度お試しください。",
    );
  });
});
