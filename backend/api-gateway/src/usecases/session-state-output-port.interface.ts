import type { SessionPlatform, SessionState } from "@comment-dock/shared";

export type SessionStateOutputEvent = {
  platform: SessionPlatform;
  state: SessionState;
  reason?: string;
};

export interface SessionStateOutputPort {
  publishSessionState(event: SessionStateOutputEvent): Promise<void>;
}
