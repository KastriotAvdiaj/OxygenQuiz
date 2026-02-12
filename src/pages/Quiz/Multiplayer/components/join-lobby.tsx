import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff } from "lucide-react";
import { useNotifications } from "@/common/Notifications";

export const JoinLobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected, joinSession } = useMultiplayer();
  const { addNotification } = useNotifications();
  
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState(searchParams.get("code") || "");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill room code from URL if present
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleJoinLobby = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!roomCode.trim()) {
      setError("Room code is required");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinSession(roomCode.toUpperCase(), username.trim());

      // Store session info
      sessionStorage.setItem("quiz_session", JSON.stringify({ 
        sessionId: roomCode.toUpperCase(), 
        username: username.trim() 
      }));

      addNotification({
        type: "success",
        title: "Successfully joined lobby!"
      });

      // Navigate to lobby
      navigate(`/multiplayer/lobby/${roomCode.toUpperCase()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join lobby";
      setError(errorMessage);

      addNotification({
        type: "error",
        title: "Failed to join lobby - Please check the room code"
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl my-4">
        <CardHeader className="space-y-2 sm:space-y-4 text-center py-4 sm:py-6">
          <div className="flex justify-center">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold font-quiz">Join Lobby</CardTitle>
          <CardDescription className="text-sm sm:text-base md:text-lg">
            Enter the room code to join a multiplayer quiz
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
          {/* Room Code Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Code *</label>
            <Input
              type="text"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="h-12 sm:h-14 text-xl sm:text-2xl font-mono tracking-widest text-center uppercase"
              maxLength={6}
            />
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Username *</label>
            <Input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 sm:h-12 text-base sm:text-lg"
              maxLength={20}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoinLobby}
            disabled={!isConnected || !username.trim() || !roomCode.trim() || isJoining}
            className="w-full h-12 sm:h-14 text-lg sm:text-xl font-bold font-quiz tracking-wider shadow-lg hover:translate-y-[-2px] transition-all"
            size="lg"
          >
            {isJoining ? "Joining..." : "Join Lobby"}
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
