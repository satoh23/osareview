import { viewerProfiles } from "../model/viewer-profile-mock";
import type { EnrichedComment } from "../../comment";
import type { ViewerProfile } from "../model/types";

export type ViewerProfileRepository = {
  getViewerProfile: (userId: string) => Promise<ViewerProfile | undefined>;
  listViewerProfiles: () => Promise<ViewerProfile[]>;
};

// TODO(backend): 現在はプロトタイプ由来の mock を返す。
// 将来は SQLite / API から user, comments, tags, memo, support を集約して ViewerProfile を組み立てる。
export const viewerProfilesRepository: ViewerProfileRepository = {
  async getViewerProfile(userId) {
    return cloneViewerProfile(
      viewerProfiles.find((profile) => profile.userId === userId),
    );
  },
  async listViewerProfiles() {
    return viewerProfiles.map(cloneExistingViewerProfile);
  },
};

export const getViewerProfile = viewerProfilesRepository.getViewerProfile.bind(
  viewerProfilesRepository,
);

export const listViewerProfiles =
  viewerProfilesRepository.listViewerProfiles.bind(viewerProfilesRepository);

const cloneViewerProfile = (
  profile: ViewerProfile | undefined,
): ViewerProfile | undefined => {
  if (!profile) {
    return undefined;
  }

  return cloneExistingViewerProfile(profile);
};

const cloneExistingViewerProfile = (profile: ViewerProfile): ViewerProfile => {
  return {
    ...profile,
    statuses: [...profile.statuses],
    tags: [...profile.tags],
    pinnedComments: profile.pinnedComments.map(cloneComment),
    importantComments: profile.importantComments.map(cloneComment),
    recentComments: profile.recentComments.map(cloneComment),
  };
};

const cloneComment = (comment: EnrichedComment): EnrichedComment => ({
  ...comment,
  author: { ...comment.author },
  monetaryAmount: comment.monetaryAmount
    ? { ...comment.monetaryAmount }
    : undefined,
  commentTypes: [...comment.commentTypes],
  support: comment.support ? { ...comment.support } : undefined,
  badges: [...comment.badges],
});
