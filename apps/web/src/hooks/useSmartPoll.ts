import { useEffect, useRef } from "react";

/**
 * Visibility-aware polling. Runs `callback` every `intervalMs` while the
 * document is visible, pausing when the tab is hidden and firing once
 * immediately on re-focus. Set `enabled` to false to stop entirely.
 */
export function useSmartPoll(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const tick = () => {
      if (document.visibilityState === "visible") {
        void savedCallback.current();
      }
    };

    const start = () => {
      if (timer != null) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!cancelled) void savedCallback.current();
        start();
      } else {
        stop();
      }
    };

    // Kick off immediately when visible.
    if (document.visibilityState === "visible") {
      void savedCallback.current();
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
