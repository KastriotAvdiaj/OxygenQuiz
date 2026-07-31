import { useCallback } from "react";
import { useLobbyConnection } from "./hooks/use-lobby-connection";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useMatch } from "./hooks/use-match";
import { MultiplayerGame } from "./components/game/MultiplayerGame";
import { QuizSelectionDialog } from "./components/lobby/quiz-selection-dialog";
import { LobbyChat } from "./components/lobby/lobby-chat";
import { LobbyPageView } from "./LobbyPageView";

interface MultiplayerLobbyPageProps {
  mode?: "create" | "join";
}

export const MultiplayerLobbyPage = ({
  mode = "join",
}: MultiplayerLobbyPageProps) => {
  const {
    username,
    sessionId,
    setSessionId,
    hasJoined,
    participants,
    maxPlayers,
    copied,
    isJoining,
    joinError,
    isConnected,
    isHost,
    isReady,
    allPlayersReady,
    canStartQuiz,
    hasSelectedQuiz,
    selectedQuiz,
    showLeaveDialog,
    confirmNavigation,
    cancelNavigation,
    handleJoinSession,
    handleLeaveSession,
    handleCopyInvite,
    handleToggleReady,
    handleStartQuiz,
    handleSelectQuiz,
  } = useLobbyConnection({ mode });

  const {
    isOpen: isQuizSelectOpen,
    open: openQuizSelect,
    close: closeQuizSelect,
  } = useDisclosure();

  // Manual leave confirmation (for the Leave button in the info bar)
  const {
    isOpen: isManualLeaveOpen,
    open: openManualLeave,
    close: closeManualLeave,
  } = useDisclosure();

  const handleConfirmManualLeave = useCallback(() => {
    closeManualLeave();
    handleLeaveSession();
  }, [closeManualLeave, handleLeaveSession]);

  // Live match state (driven by server events). When a match is running we replace the lobby
  // UI with the game view; exiting returns to the lobby so players can play again.
  const match = useMatch({ sessionId, username });
  if (match.isActive) {
    return (
      <MultiplayerGame
        username={username}
        match={match}
        onExit={match.reset}
        participants={participants}
      />
    );
  }

  return (
    <LobbyPageView
      mode={mode}
      username={username}
      sessionId={sessionId}
      hasJoined={hasJoined}
      participants={participants}
      maxPlayers={maxPlayers}
      copied={copied}
      isJoining={isJoining}
      joinError={joinError}
      isConnected={isConnected}
      isHost={isHost}
      isReady={isReady}
      allPlayersReady={allPlayersReady}
      canStartQuiz={canStartQuiz}
      hasSelectedQuiz={hasSelectedQuiz}
      selectedQuiz={selectedQuiz}
      onSessionIdChange={setSessionId}
      onJoin={handleJoinSession}
      onCopyInvite={handleCopyInvite}
      onLeave={openManualLeave}
      onToggleReady={handleToggleReady}
      onStartQuiz={handleStartQuiz}
      onOpenQuizSelect={openQuizSelect}
      quizSelectionDialogSlot={
        <QuizSelectionDialog
          isOpen={isQuizSelectOpen}
          onClose={closeQuizSelect}
          onSelectQuiz={handleSelectQuiz}
          selectedQuiz={selectedQuiz}
        />
      }
      chatSlot={<LobbyChat sessionId={sessionId} username={username} />}
      navGuardLeaveDialog={{
        isOpen: showLeaveDialog,
        onConfirm: confirmNavigation,
        onCancel: cancelNavigation,
      }}
      manualLeaveDialog={{
        isOpen: isManualLeaveOpen,
        onConfirm: handleConfirmManualLeave,
        onCancel: closeManualLeave,
      }}
    />
  );
};
