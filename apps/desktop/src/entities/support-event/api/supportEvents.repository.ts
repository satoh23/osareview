import { firstRow, getDatabase } from "../../../shared/api/sqlite";
import type { InsertSupportEventInput } from "../model/types";

/**
 * `support_events` を 1 件追加し、`users` の支援サマリも更新する。
 */
export async function insertSupportEvent(
  input: InsertSupportEventInput,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO support_events (
      platform, live_session_id, user_id, event_type,
      amount_micros, currency, message, occurred_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      input.platform,
      input.liveSessionId,
      input.userId,
      input.eventType,
      input.amountMicros ?? null,
      input.currency ?? null,
      input.message ?? null,
      input.occurredAt,
    ],
  );
  const row = firstRow(rows);
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("insertSupportEvent: expected RETURNING id row");
  }

  await db.execute(
    `
    UPDATE users
    SET support_count = support_count + 1,
        last_support_at = $2
    WHERE id = $1
    `,
    [input.userId, input.occurredAt],
  );

  return row.id;
}
