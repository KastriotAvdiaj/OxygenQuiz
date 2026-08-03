import { useCallback } from "react";
import { useLobbyConnection } from "./hooks/use-lobby-connection";
import { useLobbyChat } from "./hooks/use-lobby-chat";
import { useChatUnread } from "./hooks/use-chat-unread";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useMatch } from "./hooks/use-match";
import { MultiplayerGame } from "./components/game/MultiplayerGame";
import { QuizSelectionDialog } from "./components/lobby/quiz-selection-dialog";
import { LobbyChat } from "./components/lobby/lobby-chat";
import { LeaveLobbyDialog } from "./components/lobby/leave-lobby-dialog";
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

  // Mobile chat drawer. Chat is an always-open panel on desktop, so this only drives the phone
  // layout — but the unread count has to know about it either way.
  const {
    isOpen: isChatOpen,
    open: openChat,
    close: closeChat,
  } = useDisclosure();

  // The chat subscription lives HERE, not in the chat component. LobbyPageView renders the
  // composer twice (desktop panel + mobile drawer) and useLobbyChat registers handlers on the
  // shared SignalR connection whose cleanup removes them globally — two subscribed copies would
  // mean unmounting either one silently killed the other. Hoisting it makes the duplicate render
  // harmless. See docs/RESPONSIVE.md.
  const { messages: chatMessages, send: sendChatMessage } = useLobbyChat(sessionId);

  // Visibility here means "the drawer is open" and nothing more. On desktop chat is always on
  // screen so the count is meaningless — but the button carrying the badge is `lg:hidden`, so a
  // count nobody can see costs nothing. Deliberately no breakpoint check: the lobby used to carry
  // a `useIsCompactLayout` hook for exactly this kind of question and it was deleted in the
  // panel-board redesign (docs/RESPONSIVE.md). Not worth reintroducing to hide a hidden number.
  const chatUnreadCount = useChatUnread({
    messages: chatMessages,
    username,
    isVisible: isChatOpen,
  });

  const handleChatOpenChange = useCallback(
    (open: boolean) => (open ? openChat() : closeChat()),
    [openChat, closeChat],
  );

  const handleConfirmManualLeave = useCallback(() => {
    closeManualLeave();
    handleLeaveSession();
  }, [closeManualLeave, handleLeaveSession]);

  // Live match state (driven by server events). When a match is running we replace the lobby
  // UI with the game view; exiting returns to the lobby so players can play again.
  const match = useMatch({ sessionId, username });
  if (match.isActive) {
    return (
      <>
        <MultiplayerGame
          username={username}
          match={match}
          onExit={match.reset}
          participants={participants}
        />

        {/* The navigation blocker is armed by `useLobbyConnection` for as long as you're in the
            session — including mid-match — but the dialog that explains it used to live only
            inside <LobbyPageView>, on the other side of this early return. So during a match,
            clicking a header link armed the blocker, rendered nothing, and left it stuck in
            "blocked" with no way to proceed or reset. Every further click produced a fresh
            blocker object and another render of this whole subtree, which is what froze the
            question timer (see quiz-timer.tsx). A blocked navigation must always have a visible
            way out: if you add another render branch to this page, it needs this dialog too. */}
        <LeaveLobbyDialog
          isOpen={showLeaveDialog}
          isHost={isHost}
          inMatch
          onConfirm={confirmNavigation}
          onCancel={cancelNavigation}
        />
      </>
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
      chatSlot={
        <LobbyChat
          messages={chatMessages}
          username={username}
          onSend={sendChatMessage}
        />
      }
      chatUnreadCount={chatUnreadCount}
      isChatOpen={isChatOpen}
      onChatOpenChange={handleChatOpenChange}
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
