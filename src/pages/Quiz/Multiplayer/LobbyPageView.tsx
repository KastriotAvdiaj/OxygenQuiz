import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { JoinForm } from "./components/lobby/join-form";
import { LobbyPanel } from "./components/lobby/lobby-panel";
import { RoomPanelBody } from "./components/lobby/room-panel-body";
import { ParticipantGrid } from "./components/lobby/participant-grid";
import { LobbyActions } from "./components/lobby/lobby-actions";
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
  /** Lobby's configured player limit, from the server. 0 = not known yet. */
  maxPlayers: number;
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
  /** Same idea: the real page renders the hook-wired <LobbyChat>; stories render <LobbyChatView>.
   *  Rendered exactly once — it owns a live SignalR subscription in production, so it must never
   *  be duplicated across a mobile/desktop split. */
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
 *
 * Layout is a fixed 2x2 board of <LobbyPanel>s — Players / Room on top, Chat / Game Settings
 * below — which collapses to a single stacked column under `lg`. The panels are explicitly
 * placed rather than auto-flowed so the DOM can order them for mobile (settings before chat,
 * since the ready/start buttons matter more than scrollback on a small screen) without that
 * order leaking into the desktop grid.
 */
export const LobbyPageView = ({
  mode,
  username,
  sessionId,
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
  const leaveDialogs = (
    <>
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
    </>
  );

  // flex-1 (not min-h-[calc(100vh-4rem)]): fills the layout shell's dynamic-viewport column so
  // justify-center genuinely centers within the real remaining height — a fixed calc'd
  // min-height doesn't reliably fill a flex parent the same way (docs/RESPONSIVE.md).
  //
  // font-quiz cascades to the whole lobby so labels, buttons, names and chat share the display
  // face. Two things opt out on purpose: the panel title bars (font-header — they're chrome, and
  // font-quiz is a user setting that shouldn't restyle the furniture) and the room code
  // (font-mono — 0 vs O has to be unambiguous for someone typing it in).
  // bg-muted in light mode only: the panel bodies are --background there, so the page behind them
  // has to step away from white for the panels to read as raised surfaces. Dark mode already has
  // that separation (tinted panel bodies on the dark page) and keeps its inherited background.
  const shellClassName =
    "relative w-full flex-1 text-foreground bg-cover bg-center font-quiz " +
    "bg-muted dark:bg-transparent " +
    "p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-center";

  if (!hasJoined) {
    return (
      <div className={shellClassName}>
        <Card
          hover={false}
          className="mx-auto w-full max-w-xl border border-border bg-card shadow-sm"
        >
          <CardContent className="p-4 sm:p-6">
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
          </CardContent>
        </Card>
        {leaveDialogs}
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] xl:gap-8">
        {/* ── Top left: the roster ─────────────────────────────────────────── */}
        <LobbyPanel
          title="Players"
          className="lg:col-start-1 lg:row-start-1"
          bodyClassName="min-h-[7rem] lg:min-h-[11rem]"
        >
          <ParticipantGrid
            participants={participants}
            currentUsername={username}
            maxPlayers={maxPlayers}
          />
        </LobbyPanel>

        {/* ── Top right: invite ────────────────────────────────────────────── */}
        <LobbyPanel title="Room" className="lg:col-start-2 lg:row-start-1">
          <RoomPanelBody
            sessionId={sessionId}
            participantCount={participants.length}
            maxPlayers={maxPlayers}
            copied={copied}
            onCopyInvite={onCopyInvite}
            onLeave={onLeave}
          />
        </LobbyPanel>

        {/* ── Bottom right: quiz choice + ready/start ──────────────────────────
            Ahead of chat in the DOM so the stacked mobile column puts the actions
            within reach; `lg:` placement pins it back to the right column. */}
        <LobbyPanel title="Quiz" className="lg:col-start-2 lg:row-start-2">
          <div className="flex h-full flex-col gap-2.5 lg:gap-3">
            {/* SelectedQuizDisplay owns its own "Change" affordance — it sits beside the
                caption above the card, so there's no overlay to position from out here. */}
            <SelectedQuizDisplay
              selectedQuiz={selectedQuiz}
              isHost={isHost}
              onBrowse={isHost ? onOpenQuizSelect : undefined}
            />

            <div className="mt-auto">
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
            </div>

            {isHost && quizSelectionDialogSlot}
          </div>
        </LobbyPanel>

        {/* ── Bottom left: chat ────────────────────────────────────────────── */}
        <LobbyPanel
          title="Chat"
          className="lg:col-start-1 lg:row-start-2"
          bodyClassName="p-0"
        >
          {chatSlot}
        </LobbyPanel>
      </div>

      {leaveDialogs}
    </div>
  );
};
