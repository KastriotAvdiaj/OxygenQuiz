import { describe, expect, it, vi } from "vitest";
import { createLobbyMembership } from "../lobby-rejoin";

/** The two members of HubConnection the membership uses, with a way to fire the reconnect. */
function fakeConnection(invoke: (method: string, ...args: unknown[]) => Promise<unknown> = async () => undefined) {
  let reconnected: ((connectionId?: string) => void) | undefined;
  return {
    invoke: vi.fn(invoke),
    onreconnected: vi.fn((cb: (connectionId?: string) => void) => {
      reconnected = cb;
    }),
    fireReconnected: async () => {
      reconnected?.("new-connection-id");
      // let the rejoin promise settle
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

describe("createLobbyMembership", () => {
  it("re-invokes JoinSession for the lobby this client is in when the connection comes back", async () => {
    const connection = fakeConnection();
    const membership = createLobbyMembership(connection, { onRejoinFailed: vi.fn() });

    membership.joined("ABC123");
    await connection.fireReconnected();

    expect(connection.invoke).toHaveBeenCalledWith("JoinSession", "ABC123");
  });

  it("does nothing on reconnect when this client isn't in a lobby", async () => {
    const connection = fakeConnection();
    createLobbyMembership(connection, { onRejoinFailed: vi.fn() });

    await connection.fireReconnected();

    expect(connection.invoke).not.toHaveBeenCalled();
  });

  it("forgets the lobby after leaving it", async () => {
    const connection = fakeConnection();
    const membership = createLobbyMembership(connection, { onRejoinFailed: vi.fn() });

    membership.joined("ABC123");
    membership.left();
    await connection.fireReconnected();

    expect(connection.invoke).not.toHaveBeenCalled();
  });

  it("rejoins the most recent lobby only", async () => {
    const connection = fakeConnection();
    const membership = createLobbyMembership(connection, { onRejoinFailed: vi.fn() });

    membership.joined("FIRST1");
    membership.joined("SECOND");
    await connection.fireReconnected();

    expect(connection.invoke).toHaveBeenCalledTimes(1);
    expect(connection.invoke).toHaveBeenCalledWith("JoinSession", "SECOND");
  });

  it("reports a failed rejoin with the hub's own message, and forgets the lobby", async () => {
    const connection = fakeConnection(async () => {
      throw new Error(
        "An unexpected error occurred invoking 'JoinSession' on the server. HubException: That lobby doesn't exist anymore."
      );
    });
    const onRejoinFailed = vi.fn();
    const membership = createLobbyMembership(connection, { onRejoinFailed });

    membership.joined("GONE12");
    await connection.fireReconnected();

    expect(onRejoinFailed).toHaveBeenCalledWith("GONE12", "That lobby doesn't exist anymore.");
    expect(membership.current()).toBeNull();
  });
});
