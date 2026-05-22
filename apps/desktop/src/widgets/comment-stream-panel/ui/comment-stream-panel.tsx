import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import type { SessionPlatform } from "@comment-dock/shared";
import { Sparkles } from "lucide-react";
import { CommentItem } from "../../../entities/comment";
import {
  useEnrichedComments,
  useNewCommentBadge,
} from "../../../features/comment-stream";
import { useOpenViewerCard } from "../../../features/viewer-card-window";
import {
  PlatformQuickPopover,
  usePlatformPopoverState,
  usePlatformSettings,
} from "../../../features/platform-connection";
import { Button, PlatformIcon } from "../../../shared/ui";

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

export function CommentStreamPanel() {
  const comments = useEnrichedComments();
  const openViewerCard = useOpenViewerCard();
  const {
    changeConnectionTargetMode,
    changeStreamId,
    platformSettings,
    toggleAuth,
    toggleConnection,
  } = usePlatformSettings();
  const { closePlatformPopover, selectPlatform, selectedPlatformSetting } =
    usePlatformPopoverState(platformSettings);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const isFollowingLatestRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const latestCommentId = comments[comments.length - 1]?.id;
  const hasConnectedPlatform = platformSettings.some(
    (setting) => setting.connectionStatus === "connected",
  );
  const { hasNewComments, newCommentCount, resetNewCommentCount } =
    useNewCommentBadge({
      comments,
      isAutoFollowing: isFollowingLatest,
    });

  const updateIsFollowingLatest = useCallback((next: boolean) => {
    isFollowingLatestRef.current = next;
    setIsFollowingLatest(next);
  }, []);

  const isScrolledToBottom = useCallback((): boolean => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return true;
    }
    const distanceToBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    return distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
  }, []);

  const scrollToLatest = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }
    isProgrammaticScrollRef.current = true;
    scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
      updateIsFollowingLatest(isScrolledToBottom());
    });
  }, [isScrolledToBottom, updateIsFollowingLatest]);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) {
      return;
    }
    updateIsFollowingLatest(isScrolledToBottom());
  }, [isScrolledToBottom, updateIsFollowingLatest]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (event.deltaY < 0) {
        updateIsFollowingLatest(false);
      }
    },
    [updateIsFollowingLatest],
  );

  const handleLatestClick = useCallback(() => {
    updateIsFollowingLatest(true);
    resetNewCommentCount();
    scrollToLatest();
  }, [resetNewCommentCount, scrollToLatest, updateIsFollowingLatest]);

  const handleSelectComment = useCallback(
    (comment: (typeof comments)[number]) => {
      setSelectedCommentId(comment.id);
      openViewerCard({
        userId: comment.author.id,
        displayName: comment.author.name,
      });
    },
    [openViewerCard],
  );

  useLayoutEffect(() => {
    if (isFollowingLatestRef.current) {
      scrollToLatest();
    }
  }, [latestCommentId, scrollToLatest]);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface">
      <div
        className="relative min-h-0 flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
        onWheel={handleWheel}
        ref={scrollAreaRef}
      >
        {!hasConnectedPlatform ? (
          <NoConnectionEmptyState
            onOpenPlatform={selectPlatform}
            platformSettings={platformSettings}
          />
        ) : comments.length === 0 ? (
          <NoCommentsEmptyState />
        ) : (
          <>
            <div className="w-full space-y-2 pb-4">
              {comments.map((comment) => (
                <CommentItem
                  comment={comment}
                  key={comment.id}
                  onSelect={() => handleSelectComment(comment)}
                  selected={selectedCommentId === comment.id}
                />
              ))}
            </div>
            {hasNewComments ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <Button
                  className="pointer-events-auto shadow-xl shadow-brand-pink-shadow"
                  onClick={handleLatestClick}
                  type="button"
                  variant="primary"
                >
                  新着{newCommentCount}件 ↓
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selectedPlatformSetting ? (
        <PlatformQuickPopover
          onChangeStreamId={changeStreamId}
          onChangeTargetMode={changeConnectionTargetMode}
          onClose={closePlatformPopover}
          onToggleAuth={(platform) => {
            void toggleAuth(platform);
          }}
          onToggleConnection={(platform) => {
            void toggleConnection(platform);
          }}
          setting={selectedPlatformSetting}
        />
      ) : null}
    </section>
  );
}

type NoConnectionEmptyStateProps = {
  platformSettings: ReturnType<typeof usePlatformSettings>["platformSettings"];
  onOpenPlatform: (platform: SessionPlatform) => void;
};

function NoConnectionEmptyState({
  onOpenPlatform,
  platformSettings,
}: NoConnectionEmptyStateProps) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-3xl border border-border bg-elevated/50 p-7 shadow-xl shadow-black/20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-pink/10 text-brand-pink-strong">
          <Sparkles aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-primary">
          まずは配信とつながりましょう
        </h2>
        <p className="mt-3 text-sm leading-7 text-secondary">
          YouTube または Twitch
          にログインしてコメント接続すると、ここに視聴者さんの言葉が流れてきます。
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {platformSettings.map((setting) => (
            <button
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-primary transition hover:border-brand-pink-strong/40 hover:bg-brand-pink/10"
              key={setting.platform}
              onClick={() => onOpenPlatform(setting.platform)}
              type="button"
            >
              <PlatformIcon platform={setting.platform} />
              {setting.platform === "youtube"
                ? "YouTubeを設定"
                : "Twitchを設定"}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          左上のプラットフォーム表示からも、いつでもログイン・接続できます。
        </p>
      </div>
    </div>
  );
}

function NoCommentsEmptyState() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-3xl border border-border bg-elevated/40 p-7">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/10 text-brand-purple">
          <Sparkles aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-primary">
          最初のひとことを待っています
        </h2>
        <p className="mt-3 text-sm leading-7 text-secondary">
          今日、はじめに声をかけてくれるのは誰でしょう。
          <br />
          コメントが届いたら、ここに表示されます。
        </p>
        <div className="mt-5 rounded-2xl border border-brand-pink-strong/20 bg-brand-pink/10 p-3 text-xs leading-6 text-brand-pink-strong/80">
          なんだか少し、わくわくしますね。
        </div>
      </div>
    </div>
  );
}
