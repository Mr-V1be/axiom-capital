"use client";

import App from "../../web/src/app/App";
import { ErrorBoundary } from "../../web/src/app/ErrorBoundary";
import { DataGatewayProvider } from "../../web/src/shared/data/gateway-context";

export function ClientShell() {
  return (
    <ErrorBoundary>
      <DataGatewayProvider mode="demo">
        <App />
      </DataGatewayProvider>
    </ErrorBoundary>
  );
}
