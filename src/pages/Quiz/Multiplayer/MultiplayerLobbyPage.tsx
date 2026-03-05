import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLobbyConnection } from "./hooks/use-lobby-connection";
import { LobbyHeader } from "./components/lobby/lobby-header";
import { JoinForm } from "./components/lobby/join-form";
import { LobbyInfoBar } from "./components/lobby/lobby-info-bar";
import { ParticipantGrid } from "./components/lobby/participant-grid";
import { LobbyActions } from "./components/lobby/lobby-actions";
import { LobbyInfoBanner } from "./components/lobby/lobby-info-banner";
import { QuizSelectionDialog } from "./components/lobby/quiz-selection-dialog";
import { SelectedQuizDisplay } from "./components/lobby/selected-quiz-display";
import { LeaveLobbyDialog } from "./components/lobby/leave-lobby-dialog";
import { useDisclosure } from "@/hooks/use-disclosure";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface MultiplayerLobbyPageProps {
  mode?: "create" | "join";
}

export const MultiplayerLobbyPage = ({
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

  return (
    <div className="relative w-full min-h-full min-h-[calc(100vh-4rem)] text-foreground bg-cover bg-center font-header p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch justify-center">
        {/* Main Lobby Area (Left or Top) */}
        <Card
          variant="lifted"
          hover={false}
          className="w-full flex-1 max-w-2xl mx-auto bg-background w-fit"
        >
          <LobbyHeader
            mode={mode}
            quizTitle={selectedQuiz?.title ?? "Multiplayer Lobby"}
            hasJoined={hasJoined}
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
              <div className="space-y-3 sm:space-y-4">
                <LobbyInfoBar
                  participantCount={participants.length}
                  sessionId={sessionId}
                  copied={copied}
                  onCopyInvite={handleCopyInvite}
                  onLeave={openManualLeave}
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
                  hasSelectedQuiz={hasSelectedQuiz}
                  onToggleReady={handleToggleReady}
                  onStartQuiz={handleStartQuiz}
                />

                <LobbyInfoBanner
                  isHost={isHost}
                  participants={participants}
                  hasSelectedQuiz={hasSelectedQuiz}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar panels (Right or Bottom) - only show when joined */}
        {hasJoined && (
          <div className="w-full max-w-2xl lg:max-w-[360px] xl:max-w-[420px] mx-auto flex flex-col gap-4 lg:gap-6 shrink-0">
            
            {/* Quiz Selection Card */}
            <Card variant="lifted" hover={false} className="w-full bg-background">
              <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-quiz tracking-wider text-muted-foreground uppercase">
                    Quiz Settings
                  </h3>
                </div>

                {/* Quiz selection — host sees picker inside a dialog, everyone sees selected quiz */}
                {isHost ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <SelectedQuizDisplay
                        selectedQuiz={selectedQuiz}
                        isHost={isHost}
                      />
                      
                      {/* Floating edit button over the selected quiz display */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={openQuizSelect}
                          className="h-8 gap-1.5 shadow-sm border border-border/50 bg-background/95 backdrop-blur-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="text-xs">{hasSelectedQuiz ? "Change" : "Select"} Quiz</span>
                        </Button>
                      </div>
                    </div>

                    {/* For case when no quiz is selected yet, provide a prominent button */}
                    {!hasSelectedQuiz && (
                      <Button 
                        onClick={openQuizSelect}
                        variant="outline" 
                        className="w-full h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Browse & Select Quiz
                      </Button>
                    )}

                    <QuizSelectionDialog
                      isOpen={isQuizSelectOpen}
                      onClose={closeQuizSelect}
                      onSelectQuiz={handleSelectQuiz}
                      selectedQuiz={selectedQuiz}
                    />
                  </div>
                ) : (
                  <SelectedQuizDisplay
                    selectedQuiz={selectedQuiz}
                    isHost={isHost}
                  />
                )}
              </CardContent>
            </Card>

            {/* Placeholder for future chat card */}
            <Card variant="lifted" hover={false} className="w-full bg-background flex-1">
              <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
                <h3 className="text-sm font-bold font-quiz tracking-wider text-muted-foreground uppercase">
                  Lobby Chat
                </h3>
                <p className="text-xs text-muted-foreground/70">
                  Coming soon...
                </p>
              </CardContent>
            </Card>

          </div>
        )}
      </div>

      {/* Navigation guard dialog (triggered by back-button / in-app navigation) */}
      <LeaveLobbyDialog
        isOpen={showLeaveDialog}
        isHost={isHost}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      {/* Manual leave dialog (triggered by the Leave button) */}
      <LeaveLobbyDialog
        isOpen={isManualLeaveOpen}
        isHost={isHost}
        onConfirm={handleConfirmManualLeave}
        onCancel={closeManualLeave}
      />
    </div>
  );
};
