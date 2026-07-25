import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { DataGatewayProvider } from "./shared/data/gateway-context";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/feedback.css";
import "./styles/forms.css";
import "./styles/features/dashboard.css";
import "./styles/features/accounts.css";
import "./styles/features/account-details.css";
import "./styles/features/trading.css";
import "./styles/features/trading/order-ticket.css";
import "./styles/features/settlements.css";
import "./styles/responsive/tablet.css";
import "./styles/responsive/mobile.css";
import "./styles/responsive/account-details.css";

createRoot(document.getElementById("root")!, {
  onUncaughtError: (error, info) => {
    console.error("Uncaught root error", error, info.componentStack);
  },
  onRecoverableError: (error, info) => {
    console.warn("Recoverable React error", error, info.componentStack);
  },
}).render(
  <StrictMode>
    <ErrorBoundary>
      <DataGatewayProvider
        mode={import.meta.env.VITE_DATA_MODE === "api" ? "api" : "demo"}
        apiUrl={import.meta.env.VITE_API_URL}
      >
        <App />
      </DataGatewayProvider>
    </ErrorBoundary>
  </StrictMode>,
);
