import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MainErrorFallback } from "./Main-Error-Boundary"; // Matches your new filename

const meta = {
  title: "Errors/MainErrorFallback",
  component: MainErrorFallback,
  parameters: {
    // Sets viewport to full screen to simulate a true browser crash
    layout: "fullscreen",
  },
  args: {
    // Satisfies callback requirement using fn() for action logging
    resetErrorBoundary: fn(),
  },
} satisfies Meta<typeof MainErrorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Mock Errors for Testing Different Crash States ---

// Scenario 1: A standard TypeScript/JS runtime crash with a heavy stack trace
const runtimeError = new Error("TypeError: Cannot read properties of undefined (reading 'phase')");
runtimeError.stack = `TypeError: Cannot read properties of undefined (reading 'phase')
    at MultiplayerGame (src/pages/Quiz/Multiplayer/components/game/MultiplayerGame.tsx:24:18)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:15486:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:18062:13)`;

export const RuntimeCrash: Story = {
  args: {
    error: runtimeError,
  },
};

// Scenario 2: A simulated network/API connection failure
const apiError = new Error("Failed to establish SignalR connection to the hub. Retries exhausted.");
apiError.stack = `Error: Failed to establish SignalR connection
    at SignalRConnection.start (src/services/signalr.ts:42:11)
    at async initConnection (src/hooks/use-match.ts:18:7)`;

export const ServerConnectionFailure: Story = {
  args: {
    error: apiError,
  },
};

// Scenario 3: A barebones error containing no stack trace
export const MinimalError: Story = {
  args: {
    error: new Error("An unknown hardware assertion failed."),
  },
};