// entities/viewer-profile slice の Public API。
// getViewerProfile / viewerProfilesRepository は deprecated のため Public API から除外。
// テスト・参照用として viewer-profiles.repository.ts を直接 import すること。
export {
  formatHistoryMode,
  formatPlatformLabel,
  formatRelationshipTab,
  formatViewerProfileStats,
  formatViewerProfileStatusSummary,
} from "./lib/format";
export type {
  HistoryMode,
  RelationshipTab,
  ViewerProfile,
  ViewerProfileLookupKey,
} from "./model/types";
export { tagCandidates } from "./config/tag-candidates";
// viewer-profile-mock はテスト・開発参照用に残すが Public API には含めない。
