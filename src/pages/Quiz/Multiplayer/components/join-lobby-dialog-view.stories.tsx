import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { JoinLobbyDialogView } from "./join-lobby-dialog-view";

/**
 * Presentational half of JoinLobbyDialog. The real component wires this up to
 * useUser/useConnectionStatus (which itself pings the network)/navigation; here it's
 * driven entirely by args.
 */
const meta = {
  title: "Quiz/Multiplayer/JoinLobbyDialogView",
  component: JoinLobbyDialogView,
  parameters: { layout: "centered" },
  args: {
    open: true,
    username: "You",
    error: null,
    connectionStatus: { status: "connected" },
    onOpenChange: fn(),
    onRoomCodeChange: fn(),
    onJoin: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof JoinLobbyDialogView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { roomCode: "" },
};

export const Filled: Story = {
  args: { roomCode: "AB12CD" },
};

/** The pre-flight check is in flight — the dialog stays put rather than navigating optimistically. */
export const Checking: Story = {
  args: { roomCode: "AB12CD", isChecking: true },
};

/** CheckSession rejected the code, so the correction happens here instead of on the lobby route. */
export const RoomNotFound: Story = {
  args: {
    roomCode: "BADCOD",
    error:
      "That room code doesn't exist. Check the code, or ask the host for a new invite.",
  },
};

/** The failure mode that used to be misreported as a missing room. */
export const LobbyFull: Story = {
  args: {
    roomCode: "AB12CD",
    error: "This lobby is full.",
  },
};

export const NoInternet: Story = {
  args: {
    roomCode: "AB12CD",
    connectionStatus: { status: "no-internet", message: "No internet connection" },
  },
};

export const ServerUnavailable: Story = {
  args: {
    roomCode: "AB12CD",
    connectionStatus: { status: "server-down", message: "Game server unavailable" },
  },
};
