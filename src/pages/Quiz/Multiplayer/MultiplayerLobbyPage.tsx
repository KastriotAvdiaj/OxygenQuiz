import { Card, CardContent } from "@/components/ui/card";
import { useLobbyConnection } from "./hooks/use-lobby-connection";
import { LobbyHeader } from "./components/lobby/lobby-header";
import { JoinForm } from "./components/lobby/join-form";
import { LobbyInfoBar } from "./components/lobby/lobby-info-bar";
import { ParticipantGrid } from "./components/lobby/participant-grid";
import { LobbyActions } from "./components/lobby/lobby-actions";
import { LobbyInfoBanner } from "./components/lobby/lobby-info-banner";

interface MultiplayerLobbyPageProps {
  quizId?: string;
  quizTitle?: string;
  questionCount?: number;
  difficulty?: string;
  category?: string;
  mode?: "create" | "join";
}

export const MultiplayerLobbyPage = ({
  quizId = "",
  quizTitle = "Multiplayer Lobby",
  questionCount = 10,
  difficulty = "Medium",
  category = "General Knowledge",
  mode = "join",
}: MultiplayerLobbyPageProps) => {
  const {
    username,
    setUsername,
    sessionId,
    setSessionId,
    hasJoined,
    participants,
    copied,
    isJoining,
    joinError,
    isConnected,
    isHost,
    isReady,
    allPlayersReady,
    canStartQuiz,
    handleJoinSession,
    handleLeaveSession,
    handleCopyInvite,
    handleToggleReady,
    handleStartQuiz,
  } = useLobbyConnection({ mode, quizId });

  return (
    <div className="relative w-full text-foreground bg-cover bg-center font-header flex justify-center items-start p-2 sm:p-4 py-2 sm:py-4 md:py-8">
      <Card
        variant="lifted"
        hover={false}
        className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl bg-background my-2"
      >
        <LobbyHeader
          mode={mode}
          quizTitle={quizTitle}
          isConnected={isConnected}
          hasJoined={hasJoined}
          questionCount={questionCount}
          difficulty={difficulty}
          category={category}
        />

        <CardContent className="p-3 sm:p-4 md:p-6 transition-all duration-300">
          {!hasJoined ? (
            <JoinForm
              mode={mode}
              username={username}
              sessionId={sessionId}
              isConnected={isConnected}
              isJoining={isJoining}
              joinError={joinError}
              onUsernameChange={setUsername}
              onSessionIdChange={setSessionId}
              onJoin={handleJoinSession}
            />
          ) : (
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <LobbyInfoBar
                participantCount={participants.length}
                sessionId={sessionId}
                copied={copied}
                onCopyInvite={handleCopyInvite}
                onLeave={handleLeaveSession}
              />

              <ParticipantGrid
                participants={participants}
                currentUsername={username}
              />

              <LobbyActions
                isHost={isHost}
                isReady={isReady}
                canStartQuiz={canStartQuiz}
                allPlayersReady={allPlayersReady}
                participants={participants}
                onToggleReady={handleToggleReady}
                onStartQuiz={handleStartQuiz}
              />

              <LobbyInfoBanner isHost={isHost} participants={participants} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
