// entities/viewer-profile slice の Public API。
export {
  getViewerProfile,
  listViewerProfiles,
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
} from "./model/types";
export { tagCandidates, viewerProfiles } from "./model/viewer-profile-mock";
