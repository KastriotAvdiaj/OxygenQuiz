import { useState, useEffect, useRef, useCallback } from "react";
import { useMultiplayer } from "./useMultiplayer";

type ConnectionStatus =
  | { status: "connected" }
  | { status: "no-internet"; message: string }
  | { status: "server-down"; message: string };

const PING_INTERVAL_MS = 10_000;

/**
 * Reliably detects internet connectivity and SignalR server status.
 *
 * Internet check: pings a known external endpoint (Google's connectivity check)
 * via a no-cors fetch. If the fetch resolves, internet exists. If it throws, offline.
 * This is the same approach used by Chrome, Google Docs, and many production apps.
 *
 * Server check: delegates to the SignalR `isConnected` state from the multiplayer context.
 *
 * Priority:
 *  1. No internet → "no-internet" (can't check server anyway)
 *  2. Internet OK but SignalR disconnected → "server-down"
 *  3. Both OK → "connected"
 */
export function useConnectionStatus(): ConnectionStatus {
  const { isConnected: isSignalRConnected } = useMultiplayer();
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkInternet = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Google's connectivity check endpoint — used by Chrome, Android, etc.
      // `no-cors` gives an opaque response, but if fetch resolves, we have internet.
      await fetch("https://clients3.google.com/generate_204", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount
    checkInternet();

    // Poll periodically
    intervalRef.current = setInterval(checkInternet, PING_INTERVAL_MS);

    // Also listen for browser online/offline events as fast supplementary signals
    const handleOnline = () => {
      setIsOnline(true);
      checkInternet(); // verify with a real ping
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkInternet]);

  if (!isOnline) {
    return { status: "no-internet", message: "No internet connection" };
  }

  if (!isSignalRConnected) {
    return { status: "server-down", message: "Game server unavailable" };
  }

  return { status: "connected" };
}
