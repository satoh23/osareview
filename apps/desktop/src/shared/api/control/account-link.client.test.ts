import { describe, expect, it, vi } from "vitest";
import { API_CONTROL_ERROR_MESSAGES } from "../../const";
import { ApiGatewayHttpError, createApiGatewayHttpClient } from "./http-client";
import { createAccountLinkClient } from "./account-link.client";

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });

describe("createAccountLinkClient", () => {
  it("GET /accounts で現在のアカウント連携状態を取得する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        accounts: {
          youtube: { provider: "youtube", state: "linked" },
          twitch: {
            provider: "twitch",
            state: "unlinked",
            reason: "expired",
          },
        },
      }),
    );
    const client = createAccountLinkClient(
      createApiGatewayHttpClient({
        baseUrl: "http://127.0.0.1:17332/",
        fetcher,
      }),
    );

    const accounts = await client.getAccountLinkStates();

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:17332/accounts", {
      method: "GET",
      headers: undefined,
      body: undefined,
      signal: undefined,
    });
    expect(accounts).toEqual({
      youtube: { provider: "youtube", state: "linked" },
      twitch: { provider: "twitch", state: "unlinked", reason: "expired" },
    });
  });

  it("POST /accounts/:provider/link で対象アカウント連携を開始する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        account: { provider: "youtube", state: "linking" },
      }),
    );
    const client = createAccountLinkClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    const account = await client.linkAccount("youtube");

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:17332/accounts/youtube/link",
      {
        method: "POST",
        headers: undefined,
        body: undefined,
        signal: undefined,
      },
    );
    expect(account).toEqual({ provider: "youtube", state: "linking" });
  });

  it("POST /accounts/:provider/unlink で対象アカウント連携を解除する", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        account: { provider: "twitch", state: "unlinked" },
      }),
    );
    const client = createAccountLinkClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    const account = await client.unlinkAccount("twitch");

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:17332/accounts/twitch/unlink",
      {
        method: "POST",
        headers: undefined,
        body: undefined,
        signal: undefined,
      },
    );
    expect(account).toEqual({ provider: "twitch", state: "unlinked" });
  });

  it("Gateway のエラーレスポンスを ApiGatewayHttpError として返す", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "Unsupported account provider: unknown" },
          { status: 400 },
        ),
      );
    const client = createAccountLinkClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    await expect(client.linkAccount("youtube")).rejects.toMatchObject({
      name: "ApiGatewayHttpError",
      message: "Unsupported account provider: unknown",
      status: 400,
    } satisfies Partial<ApiGatewayHttpError>);
  });

  it("想定外のレスポンス形状はエラーにする", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        accounts: {
          youtube: { provider: "youtube", state: "unexpected" },
          twitch: { provider: "twitch", state: "unlinked" },
        },
      }),
    );
    const client = createAccountLinkClient(
      createApiGatewayHttpClient({
        baseUrl: "http://localhost:17332",
        fetcher,
      }),
    );

    await expect(client.getAccountLinkStates()).rejects.toThrow(
      API_CONTROL_ERROR_MESSAGES.INVALID_ACCOUNTS_RESPONSE,
    );
  });
});
