import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeBrowserCompatibility } from "./utils/browserCompatibility";

// Initialize browser compatibility before rendering
initializeBrowserCompatibility();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
