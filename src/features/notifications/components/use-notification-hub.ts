import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { AUTH_COOKIE } from "@/lib/authHelpers";

// Same origin the rest of the app targets (see Api-client.ts / multiplayer-context.tsx).
const API_BASE = "https://localhost:7153";

/**
 * Opens an authenticated SignalR connection to the notification hub and
 * invalidates the notification queries whenever the server pushes one, so the
 * bell updates instantly. If there's no token (not logged in) it does nothing;
 * the bell still stays current via the unread-count poll.
 */
export const useNotificationHub = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = Cookies.get(AUTH_COOKIE);
    if (!token) return;

    // Tracks an unmount that happens while the connection is still negotiating
    // (React StrictMode mounts effects twice in dev). Stopping a connection
    // mid-negotiation is what produces the noisy "stopped during negotiation"
    // AbortError, so we defer the stop until it has actually connected.
    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/notificationHub`, {
        accessTokenFactory: () => Cookies.get(AUTH_COOKIE) ?? "",
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    connection
      .start()
      .then(() => {
        if (cancelled) connection.stop();
      })
      .catch((err) => {
        if (err?.name !== "AbortError" && !cancelled) {
          console.error("Notification hub connection error:", err);
        }
      });

    return () => {
      cancelled = true;
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, [queryClient]);
};
