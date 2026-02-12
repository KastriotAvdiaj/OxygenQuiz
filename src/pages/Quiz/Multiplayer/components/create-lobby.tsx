import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff } from "lucide-react";
import { useNotifications } from "@/common/Notifications";

export const CreateLobby = () => {
  const navigate = useNavigate();
  const { isConnected, createSession } = useMultiplayer();
  const { addNotification } = useNotifications();
  
  const [username, setUsername] = useState("");
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate random room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const [sessionId] = useState(generateRoomCode());

  const handleCreateLobby = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createSession(
        sessionId,
        lobbyName.trim() || "Quiz Lobby",
        maxPlayers,
        username.trim()
      );

      // Store session info
      sessionStorage.setItem("quiz_session", JSON.stringify({ sessionId, username: username.trim() }));

      addNotification({
        type: "success",
        title: "Lobby created successfully!"
      });

      // Navigate to lobby
      navigate(`/multiplayer/lobby/${sessionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create lobby";
      setError(errorMessage);

      addNotification({
        type: "error",
        title: "Failed to create lobby"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl my-4">
        <CardHeader className="space-y-2 sm:space-y-4 text-center py-4 sm:py-6">
          <div className="flex justify-center">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold font-quiz">Create Lobby</CardTitle>
          <CardDescription className="text-sm sm:text-base md:text-lg">
            Set up your multiplayer quiz lobby
          </CardDescription>
          
          {/* Connection Status */}
          <div className="flex justify-center">
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Room Code Display */}
          <div className="bg-muted p-4 sm:p-6 rounded-lg text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Room Code</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tracking-widest text-primary">
              {sessionId}
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Input
              type="text"
              variant="quiz"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 sm:h-12 text-base sm:text-lg"
              maxLength={20}
            />
          </div>

          {/* Lobby Name Input */}
          <div className="space-y-2">
            <Input
              type="text"
              variant="quiz"
              placeholder="Quiz Lobby"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              className="h-10 sm:h-12 text-base sm:text-lg"
              maxLength={30}
            />
          </div>

          {/* Max Players Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Players</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMaxPlayers(prev => Math.max(2, prev - 1))}
                disabled={maxPlayers <= 2}
                className="h-12 w-12 flex-shrink-0"
                aria-label="Decrease max players"
              >
                <span className="text-xl font-bold">−</span>
              </Button>
              
              <div className="flex-1 bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold font-mono text-primary">
                    {maxPlayers}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">players</p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMaxPlayers(prev => Math.min(10, prev + 1))}
                disabled={maxPlayers >= 10}
                className="h-12 w-12 flex-shrink-0"
                aria-label="Increase max players"
              >
                <span className="text-xl font-bold">+</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Choose between 2 and 10 players
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreateLobby}
            disabled={!isConnected || !username.trim() || isCreating}
            className="w-full h-12 sm:h-14 text-lg sm:text-xl font-bold font-quiz tracking-wider shadow-lg hover:translate-y-[-2px] transition-all"
            size="lg"
          >
            {isCreating ? "Creating..." : "Create Lobby"}
          </Button>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => navigate("/multiplayer-menu")}
            className="w-full h-10 sm:h-12"
          >
            Back to Menu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
