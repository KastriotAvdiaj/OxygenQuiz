import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { CreateLobbyDialogView } from "./create-lobby-dialog-view";

/**
 * Presentational half of CreateLobbyDialog. The real component wires this up to
 * useMultiplayer/useUser/navigation; here it's driven entirely by args.
 */
const meta = {
  title: "Quiz/Multiplayer/CreateLobbyDialogView",
  component: CreateLobbyDialogView,
  parameters: { layout: "centered" },
  args: {
    open: true,
    isCreating: false,
    onOpenChange: fn(),
    onIncrement: fn(),
    onDecrement: fn(),
    onCreate: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof CreateLobbyDialogView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { maxPlayers: 4 },
};

export const MinPlayers: Story = {
  args: { maxPlayers: 2 },
};

export const MaxPlayers: Story = {
  args: { maxPlayers: 10 },
};

export const Creating: Story = {
  args: { maxPlayers: 4, isCreating: true },
};
