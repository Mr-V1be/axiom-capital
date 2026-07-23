import { useSyncExternalStore } from "react";

export type AppRoute = "dashboard" | "accounts" | "trading" | "settlements";

const routes = new Set<AppRoute>([
  "dashboard",
  "accounts",
  "trading",
  "settlements",
]);

function routeFromLocation(): AppRoute {
  if (typeof window === "undefined") return "dashboard";
  const candidate = window.location.pathname.slice(1) as AppRoute;
  return routes.has(candidate) ? candidate : "dashboard";
}

class RouterStore {
  private route = routeFromLocation();
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("popstate", () => {
      this.route = routeFromLocation();
      this.emit();
    });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.route;

  navigate(route: AppRoute): void {
    if (route === this.route) return;
    window.history.pushState(null, "", `/${route}`);
    this.route = route;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const routerStore = new RouterStore();
const getServerRoute = (): AppRoute => "dashboard";

export function useRoute(): AppRoute {
  return useSyncExternalStore(
    routerStore.subscribe,
    routerStore.getSnapshot,
    getServerRoute,
  );
}
