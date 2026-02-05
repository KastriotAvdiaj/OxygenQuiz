import { useContext } from "react";
import { MultiplayerContext } from "../context/multiplayer-context";

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (context === undefined) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
};
