import { Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import { RuntimeProvider } from "./app/index";
import { HomePage, ViewerCardWindowPage } from "./pages";
import { RelationshipCardSkeleton } from "./features/viewer-relationship/ui/skeleton";

function AppRoot() {
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

export default AppRoot;
