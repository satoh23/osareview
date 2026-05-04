import type { TokenSet } from "../entities/token/token-set.js";

/**
 * 認可 URL 組み立てに必要な共通入力（PKCE S256 + state + redirect）。
 * 各プロバイダの OAuth 実装がクエリへマッピングする。
 */
export type AuthorizationRequest = {
  redirectUri: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  scopes: readonly string[];
};

export type ExchangeAuthorizationCodeInput = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

export type RefreshAccessTokenInput = {
  refreshToken: string;
};

/**
 * OAuth2 認可コード + PKCE でトークンを取得・更新する契約（YouTube / Twitch 等の実装が満たす）。
 * `client_id` 等は実装側の設定に閉じ、ここにはリクエストに乗る値だけを載せる。
 */
export interface OAuthClient {
  /** ブラウザで開く認可 URL（authorize エンドポイント向け）。 */
  authorize(request: AuthorizationRequest): URL;

  /** 認可コードと code_verifier をトークンエンドポイントへ送り、`TokenSet` を返す。 */
  exchange(input: ExchangeAuthorizationCodeInput): Promise<TokenSet>;

  /** refresh_token でアクセストークンを更新する。 */
  refresh(input: RefreshAccessTokenInput): Promise<TokenSet>;
}
