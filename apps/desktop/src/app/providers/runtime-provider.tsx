import { useEffect, type ReactNode } from "react";
import { createCommentIngestionRuntime } from "../../features/comment-ingestion";
import {
  bindRuntimeCloseLifecycle,
  type RuntimeLifecycleBinding,
} from "../runtime/lifecycle";

type RuntimeProviderProps = {
  children: ReactNode;
};

export function RuntimeProvider({ children }: RuntimeProviderProps) {
  useEffect(() => {
    const runtime = createCommentIngestionRuntime();
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

  return <>{children}</>;
}
