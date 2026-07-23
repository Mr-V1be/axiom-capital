import { useSyncExternalStore } from "react";

export interface SessionSnapshot {
  accessToken: string | null;
}

export class SessionStore {
  private snapshot: SessionSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storageKey = "axiom.session") {
    this.snapshot = {
      accessToken:
        typeof window === "undefined" ? null : localStorage.getItem(storageKey),
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  setAccessToken(accessToken: string | null): void {
    this.snapshot = { accessToken };
    if (accessToken) localStorage.setItem(this.storageKey, accessToken);
    else localStorage.removeItem(this.storageKey);
    this.listeners.forEach((listener) => listener());
  }
}

export const sessionStore = new SessionStore();

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getSnapshot,
  );
}
