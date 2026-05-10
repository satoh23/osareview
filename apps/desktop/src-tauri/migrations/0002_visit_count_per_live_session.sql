-- Bump users.visit_count once per (live_session, user) when the join row is first created.
-- Subsequent comments only UPDATE live_session_users (ON CONFLICT), so this trigger does not fire again.

CREATE TRIGGER IF NOT EXISTS trg_live_session_users_bump_user_visit_count
AFTER INSERT ON live_session_users
FOR EACH ROW
BEGIN
  UPDATE users SET visit_count = visit_count + 1 WHERE id = NEW.user_id;
END;
