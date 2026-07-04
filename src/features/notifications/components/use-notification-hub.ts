import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/token-store";
import { useUser } from "@/lib/Auth";

// Same origin the rest of the app targets (see Api-client.ts / multiplayer-context.tsx).
// Derived from VITE_API_URL (which includes /api) so dev → localhost, prod → api.oxygenquiz.com.
const API_BASE = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");

/**
 * Opens an authenticated SignalR connection to the notification hub and
 * invalidates the notification queries whenever the server pushes one, so the
 * bell updates instantly. If there's no token (not logged in) it does nothing;
 * the bell still stays current via the unread-count poll.
 */
export const useNotificationHub = () => {
  const queryClient = useQueryClient();
  // The access token lives in memory and starts null on reload, so we key the
  // connection on the authenticated user: once /me resolves (which means a token
  // has been obtained), this effect re-runs and the hub connects.
  const { data: user } = useUser();

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    // Tracks an unmount that happens while the connection is still negotiating
    // (React StrictMode mounts effects twice in dev). Stopping a connection
    // mid-negotiation is what produces the noisy "stopped during negotiation"
    // AbortError, so we defer the stop until it has actually connected.
    let cancelled = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/notificationHub`, {
        accessTokenFactory: () => getAccessToken() ?? "",
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
  }, [queryClient, user]);
};
