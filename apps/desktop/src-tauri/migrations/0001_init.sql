PRAGMA foreign_keys = ON;

-- =========================
-- users
-- 視聴者ごとの要約情報。
-- display_name は UPSERT で常に最新値を上書きする運用。
-- 表示名の履歴が必要になった場合は user_display_name_history を別途追加する。
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  platform TEXT NOT NULL CHECK (platform IN ('youtube','twitch')),
  platform_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,

  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,

  visit_count INTEGER NOT NULL DEFAULT 0,
  observed_comment_count INTEGER NOT NULL DEFAULT 0,

  support_count INTEGER NOT NULL DEFAULT 0,
  last_support_at TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  UNIQUE(platform, platform_user_id)
);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW BEGIN
  UPDATE users
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- =========================
-- live_sessions
-- 1回の配信。
-- 物理削除はしない運用（comments / support_events から RESTRICT で参照される）。
-- =========================
CREATE TABLE IF NOT EXISTS live_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  platform TEXT NOT NULL CHECK (platform IN ('youtube','twitch')),
  platform_live_id TEXT NOT NULL,
  title TEXT,

  started_at TEXT,
  ended_at TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  UNIQUE(platform, platform_live_id)
);

CREATE TRIGGER IF NOT EXISTS trg_live_sessions_updated_at
AFTER UPDATE ON live_sessions
FOR EACH ROW BEGIN
  UPDATE live_sessions
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- =========================
-- live_session_users
-- この配信にこのユーザーが来た記録。
-- 「コメント発生」をトリガにレコードを作成する運用（NOT NULL 列はコメント時刻ベース）。
-- =========================
CREATE TABLE IF NOT EXISTS live_session_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  live_session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,

  first_comment_at TEXT NOT NULL,
  last_comment_at TEXT NOT NULL,
  comment_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(live_session_id, user_id)
);

CREATE TRIGGER IF NOT EXISTS trg_live_session_users_updated_at
AFTER UPDATE ON live_session_users
FOR EACH ROW BEGIN
  UPDATE live_session_users
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- =========================
-- comments
-- 全コメントログ（low_signal も保存）。
-- live_sessions への FK は RESTRICT（過去ログ保護のため、配信は物理削除しない）。
-- =========================
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  live_session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,

  platform TEXT NOT NULL CHECK (platform IN ('youtube','twitch')),
  platform_comment_id TEXT,

  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'normal',
  is_low_signal INTEGER NOT NULL DEFAULT 0 CHECK (is_low_signal IN (0,1)),

  commented_at TEXT NOT NULL,
  raw_payload_json TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- user_memos
-- ユーザーごとの手動メモ（1ユーザー1メモ）
-- =========================
CREATE TABLE IF NOT EXISTS user_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER NOT NULL,
  memo TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(user_id)
);

CREATE TRIGGER IF NOT EXISTS trg_user_memos_updated_at
AFTER UPDATE ON user_memos
FOR EACH ROW BEGIN
  UPDATE user_memos
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- =========================
-- user_tags
-- ユーザーごとのタグ
-- =========================
CREATE TABLE IF NOT EXISTS user_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER NOT NULL,
  tag_name TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(user_id, tag_name)
);

-- =========================
-- pinned_comments
-- 重要コメントのピン留め。
-- comment_id NULL の「テキストのみピン」は複数許容、
-- 同じ comment_id を 2 度ピンすることは UNIQUE(user_id, comment_id) で防止。
-- =========================
CREATE TABLE IF NOT EXISTS pinned_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER NOT NULL,
  comment_id INTEGER,

  pinned_text TEXT NOT NULL,
  note TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE SET NULL,

  UNIQUE(user_id, comment_id)
);

-- =========================
-- support_events
-- 支援履歴。
-- 金額は通貨に依存しない micros 単位（× 10^6）で持ち、精度ロスを防ぐ。
-- 表示時は currency と組み合わせて 10^6 で割って整形する。
-- live_sessions への FK は RESTRICT。
-- =========================
CREATE TABLE IF NOT EXISTS support_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  platform TEXT NOT NULL CHECK (platform IN ('youtube','twitch')),
  live_session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,

  event_type TEXT NOT NULL,
  amount_micros INTEGER,
  currency TEXT,
  message TEXT,

  occurred_at TEXT NOT NULL,
  raw_payload_json TEXT,

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- indexes
-- =========================

CREATE INDEX IF NOT EXISTS idx_users_platform_user
ON users(platform, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_time
ON comments(user_id, commented_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_session_time
ON comments(live_session_id, commented_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_platform_comment
ON comments(platform, platform_comment_id)
WHERE platform_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_session_users_user_time
ON live_session_users(user_id, first_comment_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_events_user_time
ON support_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_pinned_comments_user_time
ON pinned_comments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_tags_user
ON user_tags(user_id);
