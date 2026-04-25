/**
 * YouTube Data API v3 liveChatMessages.list レスポンスのうち、
 * 現時点で必要なフィールドに絞ったプロバイダ固有DTO。
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
  /** ページング情報 */
  pageInfo?: {
    /** 総件数 */
    totalResults: number;
    /** 1ページあたり件数 */
    resultsPerPage: number;
  };
  /** チャットメッセージ一覧 */
  items: YouTubeLiveChatMessageDto[];
};

/** liveChatMessages リソースの1件 */
export type YouTubeLiveChatMessageDto = {
  /** リソース種別。固定で youtube#liveChatMessage */
  kind: "youtube#liveChatMessage";
  /** メッセージリソースのETag */
  etag: string;
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
  /** 投稿者チャンネルURL */
  channelUrl?: string;
  /** 表示名 */
  displayName: string;
  /** プロフィール画像URL */
  profileImageUrl?: string;
  /** 認証済みチャンネルか */
  isVerified?: boolean;
  /** 配信オーナー本人か */
  isChatOwner?: boolean;
  /** メンバー（スポンサー）か */
  isChatSponsor?: boolean;
  /** モデレーターか */
  isChatModerator?: boolean;
};

/** スーパーチャット詳細 */
export type YouTubeSuperChatDetailsDto = {
  /** 金額（マイクロ単位。1,000,000 = 1通貨単位） */
  amountMicros: string;
  /** 通貨コード（ISO 4217） */
  currency: string;
  /** YouTube側の表示済み文字列（例: ¥1,000） */
  amountDisplayString?: string;
  /** 購入ティア */
  tier?: number;
  /** 購入者コメント */
  userComment?: string;
};

/** スーパーステッカー詳細 */
export type YouTubeSuperStickerDetailsDto = {
  /** ステッカーのメタ情報 */
  superStickerMetadata?: {
    /** 代替テキスト */
    altText?: string;
    /** 代替テキスト言語 */
    altTextLanguage?: string;
    /** ステッカーID */
    stickerId?: string;
  };
  /** 金額（マイクロ単位） */
  amountMicros: string;
  /** 通貨コード（ISO 4217） */
  currency: string;
  /** YouTube側の表示済み文字列 */
  amountDisplayString?: string;
  /** 購入ティア */
  tier?: number;
};

/** メンバー継続マイルストーンイベント詳細 */
export type YouTubeMemberMilestoneChatDetailsDto = {
  /** ユーザーコメント */
  userComment?: string;
  /** 継続月数 */
  memberMonth?: number;
  /** メンバーレベル名 */
  memberLevelName?: string;
};
