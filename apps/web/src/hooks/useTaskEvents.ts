import { useEffect, useRef, useState } from "react";
import { subscribeTaskEvents, type TaskEvent } from "../api/client";

export type TaskEventsState = {
  connected: boolean;
  lastEvent: TaskEvent | null;
};

/**
 * Subscribe to a task's SSE event stream. When SSE cannot connect (endpoint
 * missing or network error), `connected` stays false so the caller can keep
 * its polling fallback running.
 */
export function useTaskEvents(
  taskId: string | undefined,
  onEvent: (e: TaskEvent) => void,
  enabled = true
): TaskEventsState {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TaskEvent | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!taskId || !enabled || typeof EventSource === "undefined") {
      setConnected(false);
      return;
    }

    let errored = false;
    const unsubscribe = subscribeTaskEvents(taskId, {
      onOpen: () => {
        if (!errored) setConnected(true);
      },
      onEvent: (e) => {
        setLastEvent(e);
        handlerRef.current(e);
      },
      onError: () => {
        errored = true;
        setConnected(false);
      },
    });

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [taskId, enabled]);

  return { connected, lastEvent };
}
