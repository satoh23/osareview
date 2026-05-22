import { useEffect, useState } from "react";
import {
  getViewerProfile,
  type ViewerProfile,
} from "../../../entities/viewer-profile";

type ViewerProfileState = {
  profile: ViewerProfile | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useViewerProfile(
  userId: string | undefined,
): ViewerProfileState {
  const [state, setState] = useState<ViewerProfileState>({
    profile: undefined,
    isLoading: Boolean(userId),
    error: undefined,
  });

  useEffect(() => {
    if (!userId) {
      setState({ profile: undefined, isLoading: false, error: undefined });
      return;
    }

    let isActive = true;
    setState((current) => ({
      ...current,
      isLoading: true,
      error: undefined,
    }));

    void getViewerProfile(userId)
      .then((profile) => {
        if (!isActive) {
          return;
        }
        setState({ profile, isLoading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }
        setState({
          profile: undefined,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  return state;
}
