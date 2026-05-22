import React from "react";
import ReactDOM from "react-dom/client";
import AppRoot from "./app-root";
import "./shared/styles/tokens.css";
import "./shared/styles/tailwind.css";
import "./shared/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
