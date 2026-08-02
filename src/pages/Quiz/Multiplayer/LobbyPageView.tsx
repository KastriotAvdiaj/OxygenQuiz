import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { JoinForm } from "./components/lobby/join-form";
import { LobbyPanel } from "./components/lobby/lobby-panel";
import { RoomPanelBody } from "./components/lobby/room-panel-body";
import { ParticipantGrid } from "./components/lobby/participant-grid";
import { LobbyActions } from "./components/lobby/lobby-actions";
import { SelectedQuizDisplay } from "./components/lobby/selected-quiz-display";
import { LeaveLobbyDialog } from "./components/lobby/leave-lobby-dialog";
import { MobileChatDrawer } from "./components/lobby/mobile-chat-drawer";
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
  /**
   * The chat composer. Rendered **twice** — once in the desktop panel, once in the mobile
   * drawer — which is only safe because the SignalR subscription was hoisted out of it and into
   * MultiplayerLobbyPage. If a live subscription is ever pushed back down into this subtree, one
   * of the two copies has to go. See docs/RESPONSIVE.md and the note on <LobbyChat>.
   */
  chatSlot: ReactNode;
  /** Unread messages for the mobile chat button's badge. Always 0 on desktop — chat is on screen. */
  chatUnreadCount: number;
  isChatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;

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
 * placed rather than auto-flowed so the DOM can order them for mobile without that order leaking
 * into the desktop grid.
 *
 * **Under `lg` the chat panel is dropped from the column entirely** and moves into a bottom
 * drawer behind a floating button. Stacked, chat was the tallest card and sat between the player
 * and the ready/start actions; on a phone the roster and the actions are what you're watching,
 * and chat is what you dip into. See <MobileChatDrawer>.
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
  chatUnreadCount,
  isChatOpen,
  onChatOpenChange,
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
  // Above `lg` the board is sized to the viewport and divides that height between its rows, so
  // the page must never scroll. Below `lg` the column stacks and scrolls normally.
  //
  // The explicit dvh height is load-bearing and cannot be `h-full`. A percentage height only
  // resolves against an ancestor with a *definite* height, and the layout's scroll container
  // (`.app-shell-viewport`, a real `100dvh`) wraps its children in `min-h-full flex-col` —
  // `min-height: 100%` leaves the height auto. So every `h-full` below that point silently
  // computes to `auto`, which is what let this board grow with the chat log instead of clamping
  // it. Matching the container's own `padding-top: var(--header-height)` gives us the space
  // actually available below the header.
  //
  // `lg:flex-none` because an explicit height and `flex-1` fight over the same axis.
  const shellClassName =
    "relative w-full flex-1 min-h-0 text-foreground bg-cover bg-center font-quiz " +
    "bg-muted dark:bg-transparent " +
    "p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-center " +
    "lg:flex-none lg:h-[calc(100dvh-var(--header-height,4rem))] lg:overflow-hidden";

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
      {/* Above lg the board takes the shell's full height and hands it to the rows: the top row
          sizes to its content, the bottom row takes the remainder (`minmax(0,1fr)` — the `0` min
          is what lets it shrink below its content instead of overflowing). Chat and the quiz
          panel then fit whatever is left rather than dictating the page height, so the lobby
          always sits inside one screen on a laptop.
          `lg:h-full` only works here because the shell above sets a real height — see the note
          on shellClassName before changing either.
          Below lg it's a plain stacked column that scrolls. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] xl:gap-8">
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
        {/* Scrolls internally rather than clipping: on a short laptop the row can end up smaller
            than the quiz card + ready/start buttons, and losing the Start button off the bottom of
            a panel would be worse than a little scroll inside it. */}
        <LobbyPanel
          title="Quiz"
          className="lg:col-start-2 lg:row-start-2"
          bodyClassName="lg:overflow-y-auto"
        >
          <div className="flex h-full min-h-0 flex-col gap-2.5 lg:gap-3">
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

        {/* ── Bottom left: chat ──────────────────────────────────────────────
            Desktop only. On phones the stacked column put the tallest panel between the player
            and the ready/start actions, so chat moves into a drawer behind a floating button
            (below) and the column keeps only Players / Room / Quiz. */}
        {/* lg:flex, not lg:block — LobbyPanel's root is a flex column and overriding its display
            breaks the body's flex-1, which is what lets chat size to the row. */}
        <LobbyPanel
          title="Chat"
          className="hidden lg:col-start-1 lg:row-start-2 lg:flex"
          bodyClassName="p-0 min-h-0"
        >
          {chatSlot}
        </LobbyPanel>
      </div>

      <MobileChatDrawer
        isOpen={isChatOpen}
        onOpenChange={onChatOpenChange}
        unreadCount={chatUnreadCount}
      >
        {/* Same node as the desktop panel. Both containers give it a definite height to fill —
            the board's 1fr row up there, the drawer's 70dvh here — so one copy fits both. */}
        {chatSlot}
      </MobileChatDrawer>

      {leaveDialogs}
    </div>
  );
};
