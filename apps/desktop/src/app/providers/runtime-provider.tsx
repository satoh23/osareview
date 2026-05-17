import { useEffect, type ReactNode } from "react";
import {
  AccountLinkProvider,
  publishAccountLinkState,
} from "../../features/account-link";
import { createCommentIngestionRuntime } from "../../features/comment-ingestion";
import {
  publishSessionState,
  SessionStateProvider,
} from "../../features/streaming-session";
import {
  bindRuntimeCloseLifecycle,
  type RuntimeLifecycleBinding,
} from "../runtime/lifecycle";

type RuntimeProviderProps = {
  children: ReactNode;
};

export function RuntimeProvider({ children }: RuntimeProviderProps) {
  useEffect(() => {
    const runtime = createCommentIngestionRuntime({
      onSessionState: publishSessionState,
      onAccountState: publishAccountLinkState,
    });
    runtime.start();

    let binding: RuntimeLifecycleBinding | undefined;

    void (async () => {
      binding = await bindRuntimeCloseLifecycle(runtime);
    })();

    return () => {
      binding?.unbind();
      if (!binding?.isCloseHandled()) {
        void runtime.stop(true);
      }
    };
  }, []);

  return (
    <AccountLinkProvider>
      <SessionStateProvider>{children}</SessionStateProvider>
    </AccountLinkProvider>
  );
}
