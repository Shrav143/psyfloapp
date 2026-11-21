import "@fontsource-variable/dm-sans";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./tokens.css";
import "./panel/base.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
