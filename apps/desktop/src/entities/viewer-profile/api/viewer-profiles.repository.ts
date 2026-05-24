import { COMMENT_EVENT_TYPES } from "@comment-dock/shared";
import type { CommentSource } from "@comment-dock/shared";
import { listCommentsByUserId } from "../../comment/api/comments.repository";
import type { CommentHistoryRow } from "../../comment/api/comments.repository";
import { isLowSignalText, type EnrichedComment } from "../../comment";
import { listPinnedCommentsByUserId } from "../../pinned-comment/api/pinned-comments.repository";
import type { PinnedCommentRow } from "../../pinned-comment/model/types";
import { findUserByPlatformUserId } from "../../user/api/users.repository";
import type { UserRow } from "../../user/model/types";
import {
  PINNED_COMMENTS_LIMIT,
  VIEWER_PROFILE_HISTORY_LIMIT,
} from "../config/limits";
import type { ViewerProfile, ViewerProfileLookupKey } from "../model/types";

export type ViewerProfileRepository = {
  getViewerProfile: (
    key: ViewerProfileLookupKey,
  ) => Promise<ViewerProfile | null>;
};

export const viewerProfilesRepository: ViewerProfileRepository = {
  async getViewerProfile(key) {
    const user = await findUserByPlatformUserId(key);
    if (!user) return null;

    const [commentRows, pinnedRows] = await Promise.all([
      listCommentsByUserId({
        userId: user.id,
        limit: VIEWER_PROFILE_HISTORY_LIMIT,
      }),
      listPinnedCommentsByUserId({
        userId: user.id,
        limit: PINNED_COMMENTS_LIMIT,
      }),
    ]);

    const pinnedCommentDbIds = new Set(
      pinnedRows
        .map((r) => r.commentId)
        .filter((id): id is number => id !== null),
    );

    const recentComments = commentRows.map((row) =>
      commentRowToEnrichedComment(row, user, pinnedCommentDbIds),
    );
    const pinnedComments = pinnedRows.map((row) =>
      pinnedRowToEnrichedComment(row, user),
    );

    return {
      userId: `${user.platform}:${user.platformUserId}`,
      platform: user.platform as CommentSource,
      displayName: user.displayName,
      firstSeenAt: user.firstSeenAt,
      lastSeenAt: user.lastSeenAt,
      visitCount: user.visitCount,
      commentCount: user.observedCommentCount,
      supportCount: user.supportCount,
      lastSupportAt: user.lastSupportAt ?? undefined,
      statuses: [], // TODO(backend): サーバ判定が入ったら反映
      tags: [], // TODO(backend): タグ実装後に反映
      memo: "", // TODO(backend): メモ実装後に反映
      pinnedComments,
      importantComments: [], // TODO(backend): 重要コメント判定が入ったら反映
      recentComments,
    };
  },
};

export const getViewerProfile = viewerProfilesRepository.getViewerProfile.bind(
  viewerProfilesRepository,
);

function commentRowToEnrichedComment(
  row: CommentHistoryRow,
  user: UserRow,
  pinnedCommentDbIds: Set<number>,
): EnrichedComment {
  return {
    id: String(row.id),
    source: row.platform as CommentSource,
    author: { id: user.platformUserId, name: user.displayName },
    text: row.commentText,
    publishedAt: row.commentedAt,
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    viewerStatus: undefined,
    commentTypes: [], // TODO(backend): 分類判定が入ったら反映
    isLowSignal: row.isLowSignal || isLowSignalText(row.commentText),
    isImportant: false, // TODO(backend): 重要度判定が入ったら反映
    isPinned: pinnedCommentDbIds.has(row.id),
    badges: [], // TODO(backend): バッジ情報が入ったら反映
    liveSessionTitle: row.liveSessionTitle ?? undefined,
  };
}

function pinnedRowToEnrichedComment(
  row: PinnedCommentRow,
  user: UserRow,
): EnrichedComment {
  return {
    id: row.commentId !== null ? String(row.commentId) : `pinned-${row.id}`,
    source: (row.commentPlatform ?? user.platform) as CommentSource,
    author: { id: user.platformUserId, name: user.displayName },
    text: row.commentText ?? row.pinnedText,
    publishedAt: row.commentedAt ?? "",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    viewerStatus: undefined,
    commentTypes: [], // TODO(backend): 分類判定が入ったら反映
    isLowSignal: false,
    isImportant: false,
    isPinned: true,
    badges: [], // TODO(backend): バッジ情報が入ったら反映
    liveSessionTitle: row.liveSessionTitle ?? undefined,
  };
}
