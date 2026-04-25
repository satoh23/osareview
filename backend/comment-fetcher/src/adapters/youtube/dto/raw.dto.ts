/**
 * YouTube Data API v3 liveChatMessages.list レスポンスのうち、
 * 現時点のクライアント実装で必要なフィールドに絞ったプロバイダ固有DTO。
 *
 * メモ（将来の拡張で再追加しうる取得可能項目）:
 * - response.pageInfo.totalResults / resultsPerPage
 *   -> 検索結果の総件数と、1ページあたり件数（ページング表示や監視用途）。
 * - item.kind / item.etag
 *   -> リソース種別とETag（キャッシュ制御や差分検知の補助情報）。
 * - authorDetails.channelUrl / profileImageUrl / isVerified / isChatOwner /
 *   isChatSponsor / isChatModerator
 *   -> 投稿者プロフィールURL、アイコン、認証済み/配信者/メンバー/モデレーター属性。
 * - superChatDetails.amountDisplayString / tier / userComment
 *   -> 表示用金額文字列、購入ティア、ユーザーコメント。
 * - superStickerDetails.superStickerMetadata / amountDisplayString / tier
 *   -> ステッカー識別情報、表示用金額文字列、購入ティア。
 * - memberMilestoneChatDetails.userComment / memberLevelName
 *   -> 継続マイルストーン時のユーザーコメントとメンバーランク名。
 *
 * このDTOは「今使う最小集合」を保つ方針のため、上記はコメントのみ保持する。
 * 参照: https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list
 * 参照: https://developers.google.com/youtube/v3/live/docs/liveChatMessages
 */
export type YouTubeLiveChatMessagesListResponseDto = {
  /** リソース種別。固定で youtube#liveChatMessageListResponse */
  kind: "youtube#liveChatMessageListResponse";
  /** レスポンスのETag */
  etag: string;
  /** 次回リクエストまで待つ推奨ミリ秒 */
  pollingIntervalMillis?: number;
  /** 次ページ取得用トークン */
  nextPageToken?: string;
  /** チャットメッセージ一覧 */
  items: YouTubeLiveChatMessageDto[];
};

/** liveChatMessages リソースの1件 */
export type YouTubeLiveChatMessageDto = {
  /** メッセージID（重複排除キーとして利用可） */
  id: string;
  /** メッセージ本体情報 */
  snippet: YouTubeLiveChatMessageSnippetDto;
  /** 投稿者情報 */
  authorDetails: YouTubeLiveChatAuthorDetailsDto;
};

/** メッセージ本文・イベント種別などの本体情報 */
export type YouTubeLiveChatMessageSnippetDto = {
  /** メッセージ種別（例: textMessageEvent, superChatEvent） */
  type: YouTubeLiveChatMessageType;
  /** 所属するライブチャットID */
  liveChatId: string;
  /** 投稿者のチャンネルID */
  authorChannelId: string;
  /** 投稿日時（RFC3339 文字列） */
  publishedAt: string;
  /** 画面表示可能な本文を持つかどうか */
  hasDisplayContent: boolean;
  /** 表示用本文（絵文字含む） */
  displayMessage: string;
  /** type=superChatEvent のときに付与 */
  superChatDetails?: YouTubeSuperChatDetailsDto;
  /** type=superStickerEvent のときに付与 */
  superStickerDetails?: YouTubeSuperStickerDetailsDto;
  /** type=memberMilestoneChatEvent のときに付与 */
  memberMilestoneChatDetails?: YouTubeMemberMilestoneChatDetailsDto;
};

/**
 * YouTube Live Chat message type の既知集合。
 * 未知値が来ても受けられるように string フォールバックを許可する。
 *
 * 未知値を受け取る理由:
 * - DTO層は「外部APIから受け取った事実」を保持する責務であり、
 *   ここで未知値を弾くと API 側の仕様追加時に取得処理全体が停止するため。
 * - 未知値の扱いは mapper/usecase 層で明示的に行う
 *   （例: ログ出力して無視、unknownイベントとして変換、必要ならエラー化）。
 *
 * つまり「DTOでは受け取る」「業務判断は後段で行う」という責務分離を採用する。
 */
export type YouTubeLiveChatMessageType =
  | "textMessageEvent"
  | "superChatEvent"
  | "superStickerEvent"
  | "memberMilestoneChatEvent"
  | "newSponsorEvent"
  | "messageDeletedEvent"
  | "messageRetractedEvent"
  | "userBannedEvent"
  | "pollEvent"
  | (string & {});

/** 投稿者情報 */
export type YouTubeLiveChatAuthorDetailsDto = {
  /** 投稿者チャンネルID */
  channelId: string;
  /** 表示名 */
  displayName: string;
};

/** スーパーチャット詳細 */
export type YouTubeSuperChatDetailsDto = {
  /** 金額（マイクロ単位。1,000,000 = 1通貨単位） */
  amountMicros: string;
  /** 通貨コード（ISO 4217） */
  currency: string;
};

/** スーパーステッカー詳細 */
export type YouTubeSuperStickerDetailsDto = {
  /** 金額（マイクロ単位） */
  amountMicros: string;
  /** 通貨コード（ISO 4217） */
  currency: string;
};

/** メンバー継続マイルストーンイベント詳細 */
export type YouTubeMemberMilestoneChatDetailsDto = {
  /** 継続月数 */
  memberMonth?: number;
};
