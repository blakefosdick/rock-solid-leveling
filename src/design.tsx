import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DesignPage from "./DesignPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignPage />
  </StrictMode>
);
