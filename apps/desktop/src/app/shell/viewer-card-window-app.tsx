import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "../../features/theme";
import { RelationshipCardSkeleton } from "../../features/viewer-relationship/ui/skeleton";

const ViewerCardWindowPage = lazy(() =>
  import("../../pages/viewer-card-window").then((m) => ({
    default: m.ViewerCardWindowPage,
  })),
);

export function ViewerCardWindowApp() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Suspense fallback={<RelationshipCardSkeleton />}>
          <Routes>
            <Route
              element={<ViewerCardWindowPage />}
              path="/viewer-card/:platform/:platformUserId"
            />
          </Routes>
        </Suspense>
      </HashRouter>
    </ThemeProvider>
  );
}
