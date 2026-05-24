import { useEffect, useState } from "react";
import { findUserByPlatformUserId, type UserRow } from "../../../entities/user";
import type { DbPlatform } from "../../../entities/live-session/model/types";
import { markPerf, measurePerf } from "../../../shared/lib";

type ViewerUserLookupKey = {
  platform: DbPlatform;
  platformUserId: string;
};

type ViewerUserState = {
  user: UserRow | null | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useViewerUser(
  key: ViewerUserLookupKey | undefined,
): ViewerUserState {
  const [state, setState] = useState<ViewerUserState>({
    user: undefined,
    isLoading: Boolean(key),
    error: undefined,
  });

  useEffect(() => {
    if (!key) {
      setState({ user: undefined, isLoading: false, error: undefined });
      return;
    }

    let isActive = true;
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    markPerf("viewer-card:user-fetch-start");

    void findUserByPlatformUserId(key)
      .then((user) => {
        if (!isActive) return;
        markPerf("viewer-card:user-fetch-end");
        measurePerf(
          "viewer-card:user-fetch",
          "viewer-card:user-fetch-start",
          "viewer-card:user-fetch-end",
        );
        setState({ user, isLoading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          user: undefined,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      isActive = false;
    };
  }, [key?.platform, key?.platformUserId]);

  return state;
}
