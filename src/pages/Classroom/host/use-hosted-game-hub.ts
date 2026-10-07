import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/token-store";
import { classroomKeys } from "@/lib/query-keys";
import type { HostedGameView } from "../api/hosted-games";

// Same origin as the other hubs (use-notification-hub.ts).
const API_BASE = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");

const build = (withToken: boolean) =>
  new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE}/hostedGameHub`, withToken ? { accessTokenFactory: () => getAccessToken() ?? "" } : {})
    .withAutomaticReconnect()
    .build();

/**
 * The Controller's line to HostedGameHub (docs/quiz/classroom.md, "Screens"): joins its game's
 * group, which is what tells the server the Controller is there (closing it pauses the game after
 * a 5 s grace), and reports how many Displays are connected. A change pushed by the server — a
 * pause from another tab, a turn settled — refreshes the game; the Controller's own moves already
 * wrote their answer into the cache.
 */
export function useControllerHub(gameId: string): number {
  const queryClient = useQueryClient();
  const [displays, setDisplays] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const connection = build(true);
    connection.on("DisplaysChanged", (count: number) => {
      setDisplays(count);
      // The Answer key appears and disappears with the Displays (C8): ask for the view again.
      queryClient.invalidateQueries({ queryKey: classroomKeys.hostedGame(gameId) });
    });
    connection.on("HostedGameUpdated", () => {
      queryClient.invalidateQueries({ queryKey: classroomKeys.hostedGame(gameId) });
    });
    const join = () => connection.invoke("JoinAsController", gameId).catch(() => undefined);
    connection.onreconnected(join);
    connection
      .start()
      .then(() => (cancelled ? connection.stop() : join()))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (connection.state === signalR.HubConnectionState.Connected) connection.stop();
    };
  }, [gameId, queryClient]);

  return displays;
}

export type DisplayState =
  | { status: "idle" }
  | { status: "joining" }
  | { status: "error"; message: string }
  | { status: "showing"; view: HostedGameView; receivedAtMs: number };

/**
 * A Display's connection (ADR 0024): anonymous, joined with a Screen code, and fed the Display view
 * on every change. If the host disconnects the screens, it goes back to the code box.
 */
export function useDisplayHub() {
  const [state, setState] = useState<DisplayState>({ status: "idle" });
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const codeRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connection = build(false);
    connectionRef.current = connection;
    connection.on("HostedGameUpdated", (view: HostedGameView) =>
      setState({ status: "showing", view, receivedAtMs: Date.now() }));
    connection.on("ScreenRevoked", () => {
      codeRef.current = null;
      setState({ status: "error", message: "The teacher disconnected this screen. Enter the new code to show the game again." });
    });
    connection.onreconnected(() => {
      // A reconnect is a new connection: join again with the same code.
      if (codeRef.current) connection.invoke<HostedGameView>("JoinAsDisplay", codeRef.current)
        .then((view) => setState({ status: "showing", view, receivedAtMs: Date.now() }))
        .catch(() => setState({ status: "error", message: "Lost the game. Enter the code again." }));
    });
    connection.start().then(() => { if (cancelled) connection.stop(); }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (connection.state === signalR.HubConnectionState.Connected) connection.stop();
    };
  }, []);

  const join = async (code: string) => {
    const connection = connectionRef.current;
    if (!connection) return;
    setState({ status: "joining" });
    try {
      if (connection.state !== signalR.HubConnectionState.Connected) await connection.start();
      const view = await connection.invoke<HostedGameView>("JoinAsDisplay", code);
      codeRef.current = code;
      setState({ status: "showing", view, receivedAtMs: Date.now() });
    } catch (err) {
      const message = err instanceof Error ? err.message.replace(/^.*HubException: /, "") : "";
      setState({ status: "error", message: message || "Couldn't join. Check the code and try again." });
    }
  };

  return { state, join };
}
