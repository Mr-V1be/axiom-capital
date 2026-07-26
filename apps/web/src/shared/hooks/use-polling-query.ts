import { DependencyList, useEffect, useRef } from "react";
import { useQuery } from "./use-async";

export function usePollingQuery<T>(
  query: (signal: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
  intervalMs: number,
) {
  const result = useQuery(query, dependencies);
  const refreshRef = useRef(result.refresh);
  const running = useRef(false);

  useEffect(() => {
    refreshRef.current = result.refresh;
  }, [result.refresh]);

  useEffect(() => {
    let timer: number | undefined;
    let disposed = false;

    const refresh = async () => {
      if (
        disposed ||
        running.current ||
        document.visibilityState !== "visible"
      ) return;
      running.current = true;
      try {
        await refreshRef.current();
      } finally {
        running.current = false;
      }
    };
    const schedule = () => {
      timer = window.setTimeout(async () => {
        await refresh();
        if (!disposed) schedule();
      }, intervalMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, ...dependencies]);

  return result;
}
