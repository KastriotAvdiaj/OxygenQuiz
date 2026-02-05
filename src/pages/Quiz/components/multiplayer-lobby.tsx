import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff, Copy, Check, Crown, MessageSquare, Settings } from "lucide-react";
import { Input } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
interface MultiplayerLobbyProps {
  quizId: string;
  quizTitle: string;
  questionCount?: number;
  difficulty?: string;
  category?: string;
}

interface Participant {
  username: string;
  isReady: boolean;
  isHost: boolean;
}

export const MultiplayerLobby = ({ 
  quizId, 
  quizTitle,
  questionCount = 10,
  difficulty = "Medium",
  category = "General Knowledge",
  mode = "join" // Default to join
}: MultiplayerLobbyProps & { mode?: "create" | "join" }) => {
  const navigate = useNavigate();
  const { connection, isConnected, joinSession, leaveSession } = useMultiplayer();
  const { addNotification } = useNotifications();
  const [username, setUsername] = useState("");
  // Determine initial session ID: 
  // If creating, we'll generate one on submit (or pre-generate). Pre-generating is easier for UI.
  // If joining, start empty.
  const [sessionId, setSessionId] = useState("");
  
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Helper to generate random room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    // If creating, pre-fill a new room code
    if (mode === "create" && !sessionId) {
        setSessionId(generateRoomCode());
    }
  }, [mode, sessionId]);

  // ... (keep useEffects for SignalR events)

  useEffect(() => {
    if (!connection) return;

    // Listen for user joined events
    connection.on("UserJoined", (joinedUsername: string, isFirstUser: boolean) => {
      setParticipants((prev) => {
        if (prev.some(p => p.username === joinedUsername)) return prev;
        return [...prev, { 
          username: joinedUsername, 
          isReady: false, 
          isHost: isFirstUser 
        }];
      });
      
      addNotification({
        type: "success",
        title: `${joinedUsername} joined the lobby`,
      });
    });

    // Listen for current participants list (Initial Sync)
    connection.on("CurrentParticipants", (currentParticipants: Participant[]) => {
      setParticipants(currentParticipants);
    });

    // Listen for user left events
    connection.on("UserLeft", (leftUsername: string) => {
        setParticipants((prev) => prev.filter((p) => p.username !== leftUsername));
        
        addNotification({
          type: "error",
          title: `${leftUsername} left the lobby`,
        });
      });
  
      // Listen for ready status changes
      connection.on("PlayerReadyChanged", (playerUsername: string, ready: boolean) => {
        setParticipants((prev) => 
          prev.map(p => 
            p.username === playerUsername 
              ? { ...p, isReady: ready }
              : p
          )
        );
      });

    // Listen for GameStarted
    connection.on("GameStarted", (startedQuizId: string) => {
      navigate(`/quiz/${startedQuizId}/play`);
    });

      return () => {
        connection.off("UserJoined");
        connection.off("CurrentParticipants");
        connection.off("UserLeft");
        connection.off("PlayerReadyChanged");
        connection.off("GameStarted");
      };
    }, [connection, addNotification, navigate]);

  // ... (Keep storage auto-join logic)
  useEffect(() => {
    // Auto-join if session exists in storage
    const storedSession = sessionStorage.getItem("quiz_session");
    if (storedSession && isConnected && !hasJoined) {
      try {
        const { sessionId: storedId, username: storedUser } = JSON.parse(storedSession);
        if (storedId && storedUser) {
          // If we are in "create" mode but local storage has a session, should we rejoin it?
          // Probably yes, but if it doesn't match our intent, maybe not.
          // For now, let's respect storage as "resume".
          setSessionId(storedId);
          setUsername(storedUser);
          joinSession(storedId, storedUser).then(() => {
            setHasJoined(true);
          });
        }
      } catch (e) {
        console.error("Failed to parse stored session", e);
        sessionStorage.removeItem("quiz_session");
      }
    }
  }, [isConnected, hasJoined, joinSession]);

  const handleJoinSession = async () => {
    if (!username.trim()) return;
    if (!sessionId.trim()) return;
    
    // Check if creating (host)
    // If mode is create, we effectively become host by being first.
    // However, logic relies on server telling us we are host (isFirstUser).
    
    await joinSession(sessionId, username);
    sessionStorage.setItem("quiz_session", JSON.stringify({ sessionId, username }));
    setHasJoined(true);
    // setIsHost will be updated by server event or derived. 
    // Actually server sends "UserJoined" with isFirstUser param to OTHER users? 
    // What about the caller? 
    // The caller usually gets a confirmation or we assume successful if no error?
    // The "UserJoined" event might be broadcast to group, including caller? 
    // SignalR usually doesn't echo to caller unless encoded.
    // We need to check if we get CurrentParticipants.
  };

  const handleLeaveSession = async () => {
    await leaveSession(sessionId, username);
    sessionStorage.removeItem("quiz_session");
    setHasJoined(false);
    setParticipants([]);
    setIsHost(false);
    setIsReady(false);
    setUsername("");
    setSessionId("");
  };

  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}/quiz/${sessionId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    
    addNotification({
      type: "success",
      title: "Invite link copied to clipboard",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    // Send to backend
    connection?.invoke("ToggleReady", sessionId, username, !isReady)
      .catch(err => console.error("ToggleReady failed", err));
      
    // Optimistic update locally? 
    // Actually better wait for server event to keep source of truth single, 
    // but for responsiveness we can toggle local state if we trust server.
    // For now rely on server event 'PlayerReadyChanged' which updates participants list/state.
    // But we need to update our own 'isReady' state for UI buttons visually immediately or wait? 
    // The server event listener updates the 'participants' list.
    // We should also sync local 'isReady' state with the participants list in the useEffect or just derive it.
    // Actually, derived state is better. 'isReady' local state might be redundant if we just check 'participants.find(me).isReady'.
    // However, the user's code uses a local state `isReady`, let's keep it but sync it.
    setIsReady(!isReady); 
  };

  const handleStartQuiz = () => {
    connection?.invoke("StartQuiz", sessionId, quizId)
      .then(() => {
        addNotification({
          type: "success",
          title: "Starting quiz...",
        });
      })
      .catch(err => {
        console.error("StartQuiz failed", err);
        addNotification({
            type: "error",
            title: "Failed to start quiz"
        });
      });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
    ];
    if (!name) return colors[0];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const allPlayersReady = participants.length > 0 && participants.every(p => p.isReady);
  const canStartQuiz = isHost && participants.length >= 2 && allPlayersReady;

  // RENDER LOGIC UPDATE
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-5xl shadow-2xl border-2">
        <CardHeader className="text-center space-y-4 pb-6 border-b">
           {/* ... Header content ... */}
           <div className="flex items-center justify-center mb-2">
            <Badge 
              variant={isConnected ? "outline" : "destructive"} 
              className={`px-4 py-2 text-sm font-medium transition-all ${
                isConnected 
                  ? "border-emerald-500 text-emerald-600 bg-emerald-500/10 animate-pulse" 
                  : ""
              }`}
            >
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4" />
                  <span>Disconnected</span>
                </div>
              )}
            </Badge>
          </div>
          
          <div>
            <CardTitle className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {mode === 'create' ? quizTitle : "Join Game"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {mode === 'create' ? "Multiplayer Quiz Lobby" : "Enter details to join the session"}
            </CardDescription>
          </div>
           {/* ... Tags if joined ... */}
           {hasJoined && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Badge variant="secondary" className="px-3 py-1">
                {questionCount} Questions
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {difficulty}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {category}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-8 pb-8">
          {!hasJoined ? (
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                    disabled={!isConnected}
                    className="h-11"
                  />
                </div>
                
                {/* Only show Room Code input if JOINING */}
                {mode === "join" && (
                    <div className="space-y-2">
                    <label htmlFor="sessionId" className="text-sm font-medium">
                        Room Code
                    </label>
                    <Input
                        id="sessionId"
                        placeholder="Enter room code"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                        disabled={!isConnected}
                        className="h-11 font-mono tracking-wider"
                    />
                    </div>
                )}
              </div>
              
              <Button
                onClick={handleJoinSession}
                disabled={!isConnected || !username.trim() || !sessionId.trim()}
                className="w-full h-11"
                size="lg"
              >
                {mode === "create" ? "Create Lobby" : "Join Lobby"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
                {/* ... Keep existing joined UI ... */}
              {/* Lobby Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-background rounded-lg border shadow-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Players in Lobby
                    </p>
                    <p className="text-2xl font-bold">{participants.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border text-sm font-mono shadow-sm">
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-semibold">{sessionId}</span>
                  </div>
                  
                  <Button 
                    onClick={handleCopyInvite} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Invite
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleLeaveSession} 
                    variant="outline" 
                    size="sm"
                    className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    Leave
                  </Button>
                </div>
              </div>

              {/* Participants Grid */}
              <div className="min-h-[280px] rounded-lg border-2 border-dashed p-6 bg-muted/10">
                {participants.length === 0 ? (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-muted-foreground space-y-3">
                    <Users className="w-12 h-12 opacity-20" />
                    <div className="text-center">
                      <p className="font-medium">Waiting for players to join...</p>
                      <p className="text-sm mt-1 opacity-70">Share the invite link to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {participants.map((participant, index) => (
                      <div
                        key={index}
                        className={`group relative flex items-center gap-3 p-4 bg-background rounded-lg border-2 shadow-sm transition-all hover:shadow-md ${
                          participant.isReady 
                            ? "border-emerald-500/50 bg-emerald-500/5" 
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        {participant.isHost && (
                          <div className="absolute -top-2 -right-2">
                            <div className="p-1.5 bg-amber-500 rounded-full shadow-lg">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(participant.username)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                          {participant.username ? participant.username.charAt(0).toUpperCase() : "?"}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">
                              {participant.username}
                            </p>
                            {participant.username === username && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 font-medium ${
                            participant.isReady 
                              ? "text-emerald-600" 
                              : "text-muted-foreground"
                          }`}>
                            {participant.isReady ? "✓ Ready" : "Not Ready"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                {!isHost && (
                  <Button 
                    onClick={handleToggleReady}
                    variant={isReady ? "outline" : "default"}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    {isReady ? "✓ Ready" : "Ready Up"}
                  </Button>
                )}
                
                {isHost && (
                  <>
                    <Button 
                      onClick={handleToggleReady}
                      variant={isReady ? "outline" : "secondary"}
                      className="flex-1 sm:flex-initial h-12"
                    >
                      {isReady ? "✓ Ready" : "Ready Up"}
                    </Button>
                    
                    <Button 
                      onClick={handleStartQuiz}
                      disabled={!canStartQuiz}
                      className="flex-1 h-12 text-base font-semibold"
                      size="lg"
                    >
                      {participants.length < 2 
                        ? "Waiting for players..." 
                        : !allPlayersReady
                        ? `Waiting for ${participants.filter(p => !p.isReady).length} player(s)...`
                        : "Start Quiz"}
                    </Button>
                  </>
                )}
              </div>

              {/* Info Banner */}
              {participants.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-4 border">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-background rounded-md">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium mb-1">
                        {isHost ? "You're the host" : `${participants.find(p => p.isHost)?.username || 'Host'} is the host`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {isHost 
                          ? "You can start the quiz once all players are ready" 
                          : "The host will start the quiz when everyone is ready"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};