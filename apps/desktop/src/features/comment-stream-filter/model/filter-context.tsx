import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CommentStreamFilterContextValue = {
  hideLowSignal: boolean;
  setHideLowSignal: (hideLowSignal: boolean) => void;
  toggleHideLowSignal: () => void;
};

type CommentStreamFilterProviderProps = {
  children: ReactNode;
  initialHideLowSignal?: boolean;
};

const DEFAULT_HIDE_LOW_SIGNAL = false;

const CommentStreamFilterContext =
  createContext<CommentStreamFilterContextValue | null>(null);

export function CommentStreamFilterProvider({
  children,
  initialHideLowSignal = DEFAULT_HIDE_LOW_SIGNAL,
}: CommentStreamFilterProviderProps) {
  const [hideLowSignal, setHideLowSignal] = useState(initialHideLowSignal);

  const toggleHideLowSignal = useCallback(() => {
    setHideLowSignal((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      hideLowSignal,
      setHideLowSignal,
      toggleHideLowSignal,
    }),
    [hideLowSignal, toggleHideLowSignal],
  );

  return (
    <CommentStreamFilterContext.Provider value={value}>
      {children}
    </CommentStreamFilterContext.Provider>
  );
}

export function useCommentStreamFilter(): CommentStreamFilterContextValue {
  const context = useContext(CommentStreamFilterContext);
  if (!context) {
    throw new Error(
      "useCommentStreamFilter must be used within CommentStreamFilterProvider.",
    );
  }
  return context;
}
