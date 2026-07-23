import { DependencyList, useCallback, useEffect, useReducer, useRef } from "react";

interface QueryState<T> {
  data: T | null;
  error: Error | null;
  status: "idle" | "loading" | "success" | "error";
}

type QueryAction<T> =
  | { type: "loading" }
  | { type: "success"; data: T }
  | { type: "error"; error: Error };

function reducer<T>(state: QueryState<T>, action: QueryAction<T>): QueryState<T> {
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading", error: null };
    case "success":
      return { data: action.data, status: "success", error: null };
    case "error":
      return { ...state, status: "error", error: action.error };
  }
}

export function useQuery<T>(
  query: (signal: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
) {
  const [state, dispatch] = useReducer(reducer<T>, {
    data: null,
    error: null,
    status: "idle",
  });
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    const controller = new AbortController();
    dispatch({ type: "loading" });
    try {
      const data = await query(controller.signal);
      if (current === generation.current) {
        dispatch({ type: "success", data });
      }
    } catch (error) {
      if (current === generation.current && !controller.signal.aborted) {
        dispatch({
          type: "error",
          error: error instanceof Error ? error : new Error("Unknown error"),
        });
      }
    }
    return () => controller.abort();
  }, dependencies);

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    dispatch({ type: "loading" });
    void query(controller.signal)
      .then((data) => {
        if (current === generation.current) {
          dispatch({ type: "success", data });
        }
      })
      .catch((error) => {
        if (current === generation.current && !controller.signal.aborted) {
          dispatch({
            type: "error",
            error: error instanceof Error ? error : new Error("Unknown error"),
          });
        }
      });
    return () => controller.abort();
  }, dependencies);

  return { ...state, refresh: load };
}

export function useMutation<TInput, TResult>(
  mutation: (input: TInput) => Promise<TResult>,
) {
  const [state, dispatch] = useReducer(reducer<TResult>, {
    data: null,
    error: null,
    status: "idle",
  });

  const execute = useCallback(
    async (input: TInput) => {
      dispatch({ type: "loading" });
      try {
        const data = await mutation(input);
        dispatch({ type: "success", data });
        return data;
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error("Unknown error");
        dispatch({ type: "error", error: normalized });
        throw normalized;
      }
    },
    [mutation],
  );

  return { ...state, execute };
}
