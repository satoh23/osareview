/**
 * 認証付きリクエストの呼び出し側が 401 / UNAUTHORIZED を検知した時に投げる規約エラー。
 * `withAuthorizedRequest` はこのエラーだけを refresh + retry のトリガーとして扱う。
 */
export class UnauthorizedRequestError extends Error {
  constructor(
    message: string = "Unauthorized request.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UnauthorizedRequestError";
  }
}
