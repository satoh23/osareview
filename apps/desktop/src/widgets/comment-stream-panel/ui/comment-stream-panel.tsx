import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { CommentItem } from "../../../entities/comment";
import { useCommentStream } from "../../../features/comment-stream";
import styles from "./comment-stream-panel.module.css";

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

export function CommentStreamPanel() {
  const comments = useCommentStream();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const isFollowingLatestRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const latestCommentId = comments[comments.length - 1]?.id;

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
    scrollToLatest();
  }, [scrollToLatest, updateIsFollowingLatest]);

  useLayoutEffect(() => {
    if (isFollowingLatestRef.current) {
      scrollToLatest();
    }
  }, [latestCommentId, scrollToLatest]);

  return (
    <section className={styles.panel} aria-labelledby="comment-stream-title">
      <header className={styles.header}>
        <h2 className={styles.title} id="comment-stream-title">
          コメント
        </h2>
        <span className={styles.count}>{comments.length} 件</span>
      </header>

      <div
        className={styles.scrollArea}
        onScroll={handleScroll}
        onWheel={handleWheel}
        ref={scrollAreaRef}
      >
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem comment={comment} key={comment.id} />
          ))
        ) : (
          <div className={styles.empty}>コメントはまだありません</div>
        )}
      </div>

      {!isFollowingLatest && comments.length > 0 ? (
        <button
          className={styles.latestButton}
          onClick={handleLatestClick}
          type="button"
        >
          最新へ
        </button>
      ) : null}
    </section>
  );
}
