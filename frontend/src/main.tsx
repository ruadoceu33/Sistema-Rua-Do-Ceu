import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registrar Service Worker para PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  }).catch((err) => {
    console.error("Service Worker registration failed:", err);
  });
}

createRoot(document.getElementById("root")!).render(
  <App />
);
