import type { StreamingSessionSnapshot } from "@comment-dock/shared";

export type SessionStateEventListener = (
  session: StreamingSessionSnapshot,
) => void;

const listeners = new Set<SessionStateEventListener>();

export const publishSessionState = (
  session: StreamingSessionSnapshot,
): void => {
  for (const listener of listeners) {
    listener(session);
  }
};

export const subscribeSessionState = (
  listener: SessionStateEventListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
