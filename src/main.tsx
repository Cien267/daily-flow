import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyAccent, readStoredAccent } from "@/hooks/useAccent";

// Apply the saved accent color before first paint to avoid a flash of the default.
applyAccent(readStoredAccent());

createRoot(document.getElementById("root")!).render(<App />);
