import { MultiplayerLobbyPage } from "./MultiplayerLobbyPage";

export const MultiplayerHostWrapper = () => {

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MultiplayerLobbyPage 
        mode="create"
      />
    </div>
  );
};
