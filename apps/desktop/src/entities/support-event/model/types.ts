import type { DbPlatform } from "../../live-session/model/types";

export type InsertSupportEventInput = {
  platform: DbPlatform;
  liveSessionId: number;
  userId: number;
  eventType: string;
  amountMicros?: number | null;
  currency?: string | null;
  message?: string | null;
  occurredAt: string;
};
