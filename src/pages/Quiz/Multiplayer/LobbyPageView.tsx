import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { JoinForm } from "./components/lobby/join-form";
import { LobbyInfoBar } from "./components/lobby/lobby-info-bar";
import { ParticipantGrid } from "./components/lobby/participant-grid";
import { LobbyActions } from "./components/lobby/lobby-actions";
import { LobbyInfoBanner } from "./components/lobby/lobby-info-banner";
import { SelectedQuizDisplay } from "./components/lobby/selected-quiz-display";
import { LeaveLobbyDialog } from "./components/lobby/leave-lobby-dialog";
import type { Participant, SelectedQuiz } from "./hooks/use-lobby-connection";

interface LeaveDialogState {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface LobbyPageViewProps {
  mode: "create" | "join";
  username: string;
  sessionId: string;
  hasJoined: boolean;
  participants: Participant[];
  copied: boolean;
  isJoining: boolean;
  joinError: string | null;
  isConnected: boolean;
  isHost: boolean;
  isReady: boolean;
  allPlayersReady: boolean;
  canStartQuiz: boolean;
  hasSelectedQuiz: boolean;
  selectedQuiz: SelectedQuiz | null;

  onSessionIdChange: (value: string) => void;
  onJoin: () => void;
  onCopyInvite: () => void;
  onLeave: () => void;
  onToggleReady: () => void;
  onStartQuiz: () => void;
  onOpenQuizSelect: () => void;

  /** The real page renders the hook-wired <QuizSelectionDialog>; stories render
   *  <QuizSelectionDialogView> with fixture data. Keeps this component free of live queries. */
  quizSelectionDialogSlot: ReactNode;
  /** Same idea: the real page renders the hook-wired <LobbyChat>; stories render <LobbyChatView>. */
  chatSlot: ReactNode;

  navGuardLeaveDialog: LeaveDialogState;
  manualLeaveDialog: LeaveDialogState;
}

/**
 * The whole pre-match lobby screen — everything from "enter a room code" through the waiting
 * room (roster, ready-up, quiz picker, chat) — as one presentational component driven entirely
 * by props. Split out of MultiplayerLobbyPage (which owns the SignalR/session wiring via
 * useLobbyConnection) so the full page can be previewed in Storybook with no backend, the same
 * way MultiplayerGame previews the in-match phases.
 */
export const LobbyPageView = ({
  mode,
  username,
  sessionId,
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
  onSessionIdChange,
  onJoin,
  onCopyInvite,
  onLeave,
  onToggleReady,
  onStartQuiz,
  onOpenQuizSelect,
  quizSelectionDialogSlot,
  chatSlot,
  navGuardLeaveDialog,
  manualLeaveDialog,
}: LobbyPageViewProps) => {
  return (
    <div className="relative w-full min-h-full min-h-[calc(100vh-4rem)] text-foreground bg-cover bg-center font-header p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch justify-center">
        {/* Main Lobby Area (Left or Top) — soft card, one elevation level */}
        <Card
          hover={false}
          className="w-full flex-1 max-w-2xl mx-auto border border-border bg-card shadow-sm"
        >
          <CardContent className="p-3 sm:p-4 md:p-6 transition-all duration-300 shadow-lg">
            {!hasJoined ? (
              <JoinForm
                mode={mode}
                username={username}
                sessionId={sessionId}
                isConnected={isConnected}
                isJoining={isJoining}
                joinError={joinError}
                onSessionIdChange={onSessionIdChange}
                onJoin={onJoin}
              />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <LobbyInfoBar
                  participantCount={participants.length}
                  sessionId={sessionId}
                  copied={copied}
                  onCopyInvite={onCopyInvite}
                  onLeave={onLeave}
                />

                <ParticipantGrid participants={participants} currentUsername={username} />

                <LobbyActions
                  isHost={isHost}
                  isReady={isReady}
                  canStartQuiz={canStartQuiz}
                  allPlayersReady={allPlayersReady}
                  participants={participants}
                  hasSelectedQuiz={hasSelectedQuiz}
                  onToggleReady={onToggleReady}
                  onStartQuiz={onStartQuiz}
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
            <Card hover={false} className="w-full border border-border bg-card shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quiz
                </h3>

                {/* Quiz selection — host sees picker inside a dialog, everyone sees selected quiz */}
                {isHost ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <SelectedQuizDisplay selectedQuiz={selectedQuiz} isHost={isHost} />

                      {/* Floating edit button over the selected quiz display */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={onOpenQuizSelect}
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
                        onClick={onOpenQuizSelect}
                        variant="outline"
                        className="w-full h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Browse & Select Quiz
                      </Button>
                    )}

                    {quizSelectionDialogSlot}
                  </div>
                ) : (
                  <SelectedQuizDisplay selectedQuiz={selectedQuiz} isHost={isHost} />
                )}
              </CardContent>
            </Card>

            {/* Lobby chat (ephemeral) */}
            <Card hover={false} className="w-full border border-border bg-card shadow-sm flex-1">
              <CardContent className="p-4 sm:p-5 h-full">{chatSlot}</CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation guard dialog (triggered by back-button / in-app navigation) */}
      <LeaveLobbyDialog
        isOpen={navGuardLeaveDialog.isOpen}
        isHost={isHost}
        onConfirm={navGuardLeaveDialog.onConfirm}
        onCancel={navGuardLeaveDialog.onCancel}
      />

      {/* Manual leave dialog (triggered by the Leave button) */}
      <LeaveLobbyDialog
        isOpen={manualLeaveDialog.isOpen}
        isHost={isHost}
        onConfirm={manualLeaveDialog.onConfirm}
        onCancel={manualLeaveDialog.onCancel}
      />
    </div>
  );
};
