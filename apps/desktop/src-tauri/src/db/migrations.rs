use tauri_plugin_sql::{Migration, MigrationKind};

pub fn all() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: include_str!("../../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "visit_count_per_live_session",
            sql: include_str!("../../migrations/0002_visit_count_per_live_session.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "remove_raw_payload_json",
            sql: include_str!("../../migrations/0003_remove_raw_payload_json.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "normalize_user_tags",
            sql: include_str!("../../migrations/0004_normalize_user_tags.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
