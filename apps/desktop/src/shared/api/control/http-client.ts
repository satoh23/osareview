import { API_GATEWAY_HTTP_URL } from "./config";

type JsonObject = Record<string, unknown>;

type RequestOptions = {
  method?: "GET" | "POST";
  body?: JsonObject;
  signal?: AbortSignal;
};

export type ApiGatewayHttpClient = {
  requestJson: <T>(path: string, options?: RequestOptions) => Promise<T>;
};

// 主にテストで baseUrl / fetcher を差し替え、実 HTTP 通信なしで検証するための生成オプション。
// 本番コードは通常、既定の apiGatewayHttpClient をそのまま使う。
export type CreateApiGatewayHttpClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export class ApiGatewayHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiGatewayHttpError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

export const createApiGatewayHttpClient = (
  options: CreateApiGatewayHttpClientOptions = {},
): ApiGatewayHttpClient => {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? API_GATEWAY_HTTP_URL);
  const fetcher = options.fetcher ?? fetch;

  return {
    async requestJson<T>(
      path: string,
      requestOptions: RequestOptions = {},
    ): Promise<T> {
      const response = await fetcher(buildUrl(baseUrl, path), {
        method: requestOptions.method ?? "GET",
        headers: requestOptions.body
          ? { "Content-Type": "application/json" }
          : undefined,
        body: requestOptions.body
          ? JSON.stringify(requestOptions.body)
          : undefined,
        signal: requestOptions.signal,
      });
      const body = await readJsonBody(response);

      if (!response.ok) {
        throw new ApiGatewayHttpError(
          getErrorMessage(body, response.status),
          response.status,
          body,
        );
      }

      return body as T;
    },
  };
};

export const apiGatewayHttpClient = createApiGatewayHttpClient();

const readJsonBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiGatewayHttpError(
      "API Gateway returned invalid JSON",
      response.status,
      text,
    );
  }
};

const getErrorMessage = (body: unknown, status: number): string => {
  if (isJsonObject(body) && typeof body.error === "string") {
    return body.error;
  }
  return `API Gateway request failed with status ${status}`;
};

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
