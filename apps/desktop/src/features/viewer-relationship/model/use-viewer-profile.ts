import { useEffect, useState } from "react";
import {
  getViewerProfile,
  type ViewerProfile,
  type ViewerProfileLookupKey,
} from "../../../entities/viewer-profile";

type ViewerProfileState = {
  profile: ViewerProfile | null | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export function useViewerProfile(
  key: ViewerProfileLookupKey | undefined,
): ViewerProfileState {
  const [state, setState] = useState<ViewerProfileState>({
    profile: undefined,
    isLoading: Boolean(key),
    error: undefined,
  });

  useEffect(() => {
    if (!key) {
      setState({ profile: undefined, isLoading: false, error: undefined });
      return;
    }

    let isActive = true;
    setState((current) => ({
      ...current,
      isLoading: true,
      error: undefined,
    }));

    void getViewerProfile(key)
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
  }, [key?.platform, key?.platformUserId]);

  return state;
}
