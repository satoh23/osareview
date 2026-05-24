import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import { RuntimeProvider } from "../providers/runtime-provider";
import { RelationshipCardSkeleton } from "../../features/viewer-relationship/ui/skeleton";
import { HomePage } from "../../pages/home";

/**
 * ViewerCardWindowPage は初回ルートでは不要なため lazy にしてチャンク分割する。
 * Suspense は viewer-card ルートにだけ適用し、初期の "/" ルートは
 * 静的インポートで即時描画→黒画面フラッシュを防ぐ。
 */
const ViewerCardWindowPage = lazy(() =>
  import("../../pages/viewer-card-window").then((m) => ({
    default: m.ViewerCardWindowPage,
  })),
);

export function MainWindowApp() {
  return (
    <RuntimeProvider>
      <HashRouter>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={
              <Suspense fallback={<RelationshipCardSkeleton />}>
                <ViewerCardWindowPage />
              </Suspense>
            }
            path="/viewer-card/:platform/:platformUserId"
          />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </HashRouter>
    </RuntimeProvider>
  );
}
