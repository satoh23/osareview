import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { CommentItem } from "../../../entities/comment";
import { useCommentStream } from "../../../features/comment-stream";
import styles from "./comment-stream-panel.module.css";

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

export function CommentStreamPanel() {
  const comments = useCommentStream();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);

  const scrollToLatest = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }
    const distanceToBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    setIsFollowingLatest(distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX);
  }, []);

  const handleLatestClick = useCallback(() => {
    setIsFollowingLatest(true);
    scrollToLatest();
  }, [scrollToLatest]);

  useLayoutEffect(() => {
    if (isFollowingLatest) {
      scrollToLatest();
    }
  }, [comments.length, isFollowingLatest, scrollToLatest]);

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
