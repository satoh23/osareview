import { Component, type ReactNode } from "react";
import {
  isViewerCardWindowLabel,
  useWindowLabel,
} from "./app/window/use-window-label";
import { MainWindowApp } from "./app/shell/main-window-app";
import { ViewerCardWindowApp } from "./app/shell/viewer-card-window-app";

type ErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "24px",
            fontFamily: "monospace",
            color: "#ef4444",
            background: "#18181b",
            minHeight: "100vh",
          }}
        >
          <p style={{ marginBottom: "8px", fontWeight: "bold" }}>
            アプリの起動に失敗しました
          </p>
          <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const label = useWindowLabel();

  if (isViewerCardWindowLabel(label)) {
    return <ViewerCardWindowApp />;
  }

  return <MainWindowApp />;
}

function AppRoot() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}

export default AppRoot;
