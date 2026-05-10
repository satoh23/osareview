-- tags: タグマスタ
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(name)
);

CREATE TRIGGER IF NOT EXISTS trg_tags_updated_at
AFTER UPDATE ON tags
FOR EACH ROW BEGIN
  UPDATE tags
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- user_tag_links: ユーザーとタグの中間テーブル
CREATE TABLE IF NOT EXISTS user_tag_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tag_links_user
ON user_tag_links(user_id);

CREATE INDEX IF NOT EXISTS idx_user_tag_links_tag
ON user_tag_links(tag_id);

-- 旧 user_tags のデータを移行
INSERT INTO tags (name)
SELECT DISTINCT tag_name
FROM user_tags
ON CONFLICT(name) DO NOTHING;

INSERT INTO user_tag_links (user_id, tag_id)
SELECT ut.user_id, t.id
FROM user_tags ut
INNER JOIN tags t ON t.name = ut.tag_name
ON CONFLICT(user_id, tag_id) DO NOTHING;

DROP INDEX IF EXISTS idx_user_tags_user;
DROP TABLE IF EXISTS user_tags;
