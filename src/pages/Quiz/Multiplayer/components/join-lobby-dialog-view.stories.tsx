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

export const RoomNotFound: Story = {
  args: {
    roomCode: "BADCOD",
    error: "Room not found. Check the code and try again.",
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
