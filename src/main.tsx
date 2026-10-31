import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

async function bootstrap() {
  const enabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== "false";

  if (enabled) {
    try {
      const { worker } = await import("./mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
    } catch (err) {
      console.error("[mocks] falha ao iniciar o MSW:", err);
    }
  }

  const { default: App } = await import("./App");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
bootstrap();
