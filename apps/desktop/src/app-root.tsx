import { HashRouter, Navigate, Route, Routes } from "react-router";
import { RuntimeProvider } from "./app/index";
import { HomePage, ViewerCardWindowPage } from "./pages";

function AppRoot() {
  return (
    <RuntimeProvider>
      <HashRouter>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={<ViewerCardWindowPage />}
            path="/viewer-card/:platform/:platformUserId"
          />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </HashRouter>
    </RuntimeProvider>
  );
}

export default AppRoot;
