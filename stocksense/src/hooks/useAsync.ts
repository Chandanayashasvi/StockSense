// Generic data-fetching hook producing a consistent AsyncState<T>, so every
// list/detail screen renders loading / error / empty / success the same way
// instead of each page inventing its own flags (playbook: consistent UX states).

import { useState, useEffect, useCallback, useRef } from "react";
import type { AsyncState } from "@/types";
import { ApiError } from "@/services/apiClient";

export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, status: "idle", error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await fetcherRef.current();
      setState({ data, status: "success", error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setState({ data: null, status: "error", error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
