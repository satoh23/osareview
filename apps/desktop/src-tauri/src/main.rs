// リリースビルドで Windows に余計なコンソール窓を出さない。削除しないこと。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    comment_dock_lib::run()
}
