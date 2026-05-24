import { useMemo, useState } from "react";
import type {
  HistoryMode,
  RelationshipTab,
} from "../../../entities/viewer-profile";
import type { EnrichedComment } from "../../../entities/comment";

export function useRelationshipTabs(comments: EnrichedComment[]) {
  const [tab, setTab] = useState<RelationshipTab>("all");
  const [historyMode, setHistoryMode] = useState<HistoryMode>("filtered");

  const historyComments = useMemo(() => {
    switch (historyMode) {
      case "important":
        return comments.filter((comment) => comment.isImportant);
      case "filtered":
        return comments.filter((comment) => !comment.isLowSignal);
      case "all":
        return comments;
    }
  }, [historyMode, comments]);

  return {
    tab,
    setTab,
    historyMode,
    setHistoryMode,
    historyComments,
  };
}
