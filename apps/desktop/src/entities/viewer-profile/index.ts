// entities/viewer-profile slice の Public API。
export {
  getViewerProfile,
  viewerProfilesRepository,
  type ViewerProfileRepository,
} from "./api/viewer-profiles.repository";
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
// viewer-profile-mock はテスト・開発参照用に残すが Public API には含めない。
