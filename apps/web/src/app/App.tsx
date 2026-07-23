import { lazy, Suspense } from "react";
import { LoadingState } from "../shared/ui/DataState";
import { AppShell } from "./AppShell";
import { useRoute } from "./router-store";

const pages = {
  dashboard: lazy(() => import("../modules/dashboard/DashboardPage")),
  accounts: lazy(() => import("../modules/accounts/AccountsPage")),
  trading: lazy(() => import("../modules/trading/TradingPage")),
  settlements: lazy(() => import("../modules/settlements/SettlementsPage")),
};

export default function App() {
  const route = useRoute();
  const Page = pages[route];
  return (
    <AppShell route={route}>
      <Suspense fallback={<LoadingState />}>
        <Page />
      </Suspense>
    </AppShell>
  );
}
