import { hubErrorMessage } from "./hub-error";

/**
 * Which lobby this client is in, and getting back into it after an automatic reconnect
 * (docs/quiz/multiplayer.md §3.6).
 *
 * A reconnected SignalR connection has a **new connection id**. On the server that id is in no
 * group, has empty `Context.Items`, and the disconnect grace (5s) is counting down against the old
 * id — so without a rejoin the client stops receiving broadcasts, the `Context.Items`-based hub
 * methods refuse it, and the player is removed from the roster. In a Duel that last step is a
 * forfeit. Re-invoking `JoinSession` fixes all three: it is idempotent for an existing participant
 * and refreshes their connection id before the grace check runs.
 *
 * Kept out of the provider so it can be tested against a fake connection.
 */
export interface LobbyMembership {
  /** Record a successful create / join. */
  joined: (sessionId: string) => void;
  /** Record an explicit leave, so a later reconnect doesn't pull the player back in. */
  left: () => void;
  current: () => string | null;
}

/** The two members of `HubConnection` this needs — narrow, so a test can hand it a fake. */
export interface RejoinConnection {
  invoke(method: string, ...args: unknown[]): Promise<unknown>;
  onreconnected(callback: (connectionId?: string) => void): void;
}

interface Options {
  /** A rejoin was refused (the lobby is gone, or full) — the message is the server's. */
  onRejoinFailed: (sessionId: string, message: string) => void;
  /** A rejoin succeeded. */
  onRejoined?: (sessionId: string) => void;
}

export function createLobbyMembership(
  connection: RejoinConnection,
  { onRejoinFailed, onRejoined }: Options
): LobbyMembership {
  let sessionId: string | null = null;

  connection.onreconnected(() => {
    const id = sessionId;
    if (!id) return;
    connection
      .invoke("JoinSession", id)
      .then(() => onRejoined?.(id))
      .catch((err: unknown) => {
        // Only forget it if nothing newer was joined while the call was in flight.
        if (sessionId === id) sessionId = null;
        onRejoinFailed(id, hubErrorMessage(err, "Lost the connection to the lobby."));
      });
  });

  return {
    joined: (id) => {
      sessionId = id;
    },
    left: () => {
      sessionId = null;
    },
    current: () => sessionId,
  };
}
