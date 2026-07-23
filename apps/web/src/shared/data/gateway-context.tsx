import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { sessionStore } from "../auth/session-store";
import { DataGateway } from "./data-gateway";
import { DemoDataGateway } from "./demo-data-gateway";
import { HttpDataGateway } from "./http-data-gateway";

const DataGatewayContext = createContext<DataGateway | null>(null);

interface DataGatewayProviderProps extends PropsWithChildren {
  mode?: "api" | "demo";
  apiUrl?: string;
}

export function DataGatewayProvider({
  children,
  mode = "demo",
  apiUrl = "http://localhost:4000",
}: DataGatewayProviderProps) {
  const gateway = useMemo<DataGateway>(() => {
    if (mode === "api") {
      return new HttpDataGateway(apiUrl, sessionStore);
    }
    return new DemoDataGateway();
  }, [apiUrl, mode]);

  return (
    <DataGatewayContext.Provider value={gateway}>
      {children}
    </DataGatewayContext.Provider>
  );
}

export function useDataGateway(): DataGateway {
  const gateway = useContext(DataGatewayContext);
  if (!gateway) {
    throw new Error("useDataGateway must be used inside DataGatewayProvider");
  }
  return gateway;
}
