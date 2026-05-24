import { useEffect } from "react";
import { Navigate, useParams } from "react-router";
import { COMMENT_SOURCES, type CommentSource } from "@comment-dock/shared";
import { RelationshipWindowContent } from "../../../widgets";
import { markPerf } from "../../../shared/lib";

export function ViewerCardWindowPage() {
  const { platform, platformUserId } = useParams();

  useEffect(() => {
    markPerf("viewer-card:page-mounted");
  }, []);

  if (!platform || !platformUserId) {
    return <Navigate replace to="/" />;
  }

  const lookupKey = {
    platform: toCommentSource(platform),
    platformUserId,
  };

  return <RelationshipWindowContent lookupKey={lookupKey} />;
}

const toCommentSource = (source: string): CommentSource => {
  if (source === COMMENT_SOURCES.TWITCH) {
    return COMMENT_SOURCES.TWITCH;
  }
  return COMMENT_SOURCES.YOUTUBE;
};
