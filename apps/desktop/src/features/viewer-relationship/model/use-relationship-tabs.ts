import { useMemo, useState } from "react";
import type {
  HistoryMode,
  RelationshipTab,
  ViewerProfile,
} from "../../../entities/viewer-profile";

export function useRelationshipTabs(profile: ViewerProfile) {
  const [tab, setTab] = useState<RelationshipTab>("all");
  const [historyMode, setHistoryMode] = useState<HistoryMode>("all");

  const historyComments = useMemo(() => {
    switch (historyMode) {
      case "important":
        return profile.recentComments.filter((comment) => comment.isImportant);
      case "filtered":
        return profile.recentComments.filter((comment) => !comment.isLowSignal);
      case "all":
        return profile.recentComments;
    }
  }, [historyMode, profile.recentComments]);

  return {
    tab,
    setTab,
    historyMode,
    setHistoryMode,
    historyComments,
  };
}
