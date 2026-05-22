import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useParams } from "react-router";
import { RuntimeProvider } from "./app/index";
import {
  RelationshipCard,
  useViewerProfile,
} from "./features/viewer-relationship";
import { HomePage } from "./pages";

function AppRoot() {
  return (
    <RuntimeProvider>
      <HashRouter>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<ViewerCardRoute />} path="/viewer-card/:userId" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </HashRouter>
    </RuntimeProvider>
  );
}

function ViewerCardRoute() {
  const { userId } = useParams();
  const { error, isLoading, profile } = useViewerProfile(userId);

  if (!userId) {
    return <Navigate replace to="/" />;
  }

  if (isLoading) {
    return (
      <ViewerCardShell>
        <p className="rounded-2xl border border-border bg-elevated/50 p-4 text-sm text-muted">
          関係性カードを読み込んでいます...
        </p>
      </ViewerCardShell>
    );
  }

  if (error || !profile) {
    return (
      <ViewerCardShell>
        <div className="rounded-2xl border border-dashed border-border bg-elevated/50 p-4 text-sm text-muted">
          <p className="font-semibold text-primary">
            視聴者プロフィールが見つかりません
          </p>
          <p className="mt-1 text-xs leading-5">userId: {userId}</p>
        </div>
      </ViewerCardShell>
    );
  }

  return (
    <ViewerCardShell>
      <RelationshipCard profile={profile} />
    </ViewerCardShell>
  );
}

function ViewerCardShell({ children }: { children: ReactNode }) {
  return (
    <main className="h-screen overflow-hidden bg-surface text-primary">
      {children}
    </main>
  );
}

export default AppRoot;
