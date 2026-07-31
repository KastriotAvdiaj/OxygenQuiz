import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { LobbyPageView } from "./LobbyPageView";
import { QuizSelectionDialogView } from "./components/lobby/quiz-selection-dialog-view";
import { LobbyChatView } from "./components/lobby/lobby-chat-view";
import type { Participant } from "./hooks/use-lobby-connection";
import type { QuizSummaryDTO, SelectedQuiz } from "@/types/quiz-types";
import type { LobbyChatMessage } from "./hooks/use-lobby-chat";

/**
 * The whole pre-match lobby, end to end — every step from "enter a room code" through the
 * waiting room, without a backend. LobbyPageView is presentational (see its own docblock);
 * the real MultiplayerLobbyPage wires it to useLobbyConnection/useMatch/SignalR. The two
 * still-live pieces (quiz picker, chat) are swapped for their *View counterparts via the
 * quizSelectionDialogSlot/chatSlot props, same idea as MultiplayerGame.stories.tsx faking `match`.
 */

const demoAvatar =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f59e0b"/><circle cx="32" cy="24" r="12" fill="#fff"/><path d="M12 56c0-12 9-20 20-20s20 8 20 20" fill="#fff"/></svg>'
  );

const solo: Participant[] = [
  { username: "You", isHost: true, isReady: false, profileImageUrl: null },
];

const mixedReady: Participant[] = [
  { username: "You", isHost: true, isReady: true, profileImageUrl: null },
  { username: "Ada", isHost: false, isReady: true, profileImageUrl: demoAvatar },
  { username: "Linus", isHost: false, isReady: false, profileImageUrl: null },
];

const allReady: Participant[] = [
  { username: "You", isHost: true, isReady: true, profileImageUrl: null },
  { username: "Ada", isHost: false, isReady: true, profileImageUrl: demoAvatar },
];

const guestRoster: Participant[] = [
  { username: "Ada", isHost: true, isReady: true, profileImageUrl: demoAvatar },
  { username: "You", isHost: false, isReady: false, profileImageUrl: null },
];

// The host's pick as it arrives over SignalR. Category/difficulty are display labels the
// Game Settings panel renders as chips.
const chemistryQuiz: SelectedQuiz = {
  id: "1",
  title: "Chemistry Basics",
  category: "Science",
  difficulty: "Medium",
  questionCount: 12,
};

const quizzes: QuizSummaryDTO[] = [
  {
    id: 1,
    title: "Chemistry Basics",
    category: "Science",
    difficulty: "Medium",
    language: "English",
    gradient: true,
    colorPaletteJson: JSON.stringify(["#6366f1"]),
    timeLimitInSeconds: 20,
    status: "Public",
    createdAt: new Date().toISOString(),
    questionCount: 12,
    user: "Ada",
  },
  {
    id: 2,
    title: "World Capitals",
    category: "Geography",
    difficulty: "Easy",
    language: "English",
    gradient: true,
    colorPaletteJson: JSON.stringify(["#10b981"]),
    timeLimitInSeconds: 20,
    status: "Public",
    createdAt: new Date().toISOString(),
    questionCount: 20,
    user: "Linus",
  },
];

const closedQuizSelectionDialog = (
  <QuizSelectionDialogView
    isOpen={false}
    onClose={fn()}
    selectedQuiz={null}
    searchQuery=""
    onSearchChange={fn()}
    resultCount={quizzes.length}
    onClearFilters={fn()}
    filtersOpen={false}
    onFiltersOpenChange={fn()}
    facetCount={0}
    categories={[]}
    difficulties={[]}
    languages={[]}
    selections={{ categoryIds: [], difficultyIds: [], languageIds: [] }}
    onToggleFacet={fn()}
    onClearFacets={fn()}
    isLoading={false}
    quizzes={quizzes}
    onSelectQuiz={fn()}
    onPageChange={fn()}
  />
);

const openQuizSelectionDialog = (
  <QuizSelectionDialogView
    isOpen
    onClose={fn()}
    selectedQuiz={null}
    searchQuery=""
    onSearchChange={fn()}
    resultCount={quizzes.length}
    onClearFilters={fn()}
    filtersOpen={false}
    onFiltersOpenChange={fn()}
    facetCount={0}
    categories={[]}
    difficulties={[]}
    languages={[]}
    selections={{ categoryIds: [], difficultyIds: [], languageIds: [] }}
    onToggleFacet={fn()}
    onClearFacets={fn()}
    isLoading={false}
    quizzes={quizzes}
    onSelectQuiz={fn()}
    onPageChange={fn()}
  />
);

const emptyChat = (
  <LobbyChatView
    messages={[]}
    username="You"
    draft=""
    sending={false}
    onDraftChange={fn()}
    onSubmit={fn()}
  />
);

const conversation: LobbyChatMessage[] = [
  { username: "System", text: "Ada joined the lobby", sentUtc: "", isSystem: true },
  { username: "Ada", text: "hey, ready when you are", sentUtc: "", isSystem: false },
  { username: "You", text: "give me a sec, picking a quiz", sentUtc: "", isSystem: false },
];

const populatedChat = (
  <LobbyChatView
    messages={conversation}
    username="You"
    draft=""
    sending={false}
    onDraftChange={fn()}
    onSubmit={fn()}
  />
);

const noopLeaveDialog = { isOpen: false, onConfirm: fn(), onCancel: fn() };

const meta = {
  title: "Quiz/Multiplayer/LobbyPageView",
  component: LobbyPageView,
  parameters: { layout: "fullscreen" },
  args: {
    mode: "join",
    username: "You",
    maxPlayers: 6,
    copied: false,
    isJoining: false,
    joinError: null,
    isConnected: true,
    isHost: true,
    isReady: false,
    allPlayersReady: false,
    canStartQuiz: false,
    hasSelectedQuiz: false,
    selectedQuiz: null,
    onSessionIdChange: fn(),
    onJoin: fn(),
    onCopyInvite: fn(),
    onLeave: fn(),
    onToggleReady: fn(),
    onStartQuiz: fn(),
    onOpenQuizSelect: fn(),
    quizSelectionDialogSlot: closedQuizSelectionDialog,
    chatSlot: emptyChat,
    navGuardLeaveDialog: noopLeaveDialog,
    manualLeaveDialog: noopLeaveDialog,
  },
} satisfies Meta<typeof LobbyPageView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Step 1: not joined yet ─────────────────────────────────────────────────────
export const NotJoinedCreating: Story = {
  args: { mode: "create", hasJoined: false, sessionId: "AB12CD", participants: [] },
};

export const NotJoinedEnteringCode: Story = {
  args: { mode: "join", hasJoined: false, sessionId: "", participants: [] },
};

export const JoinFailed: Story = {
  args: {
    mode: "join",
    hasJoined: false,
    sessionId: "BADCOD",
    participants: [],
    joinError: "Room not found. Check the code and try again.",
  },
};

// ── Step 2: waiting room, as the host ──────────────────────────────────────────
export const HostAloneNoQuiz: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: solo,
    hasSelectedQuiz: false,
  },
};

export const HostQuizSelectedWaitingForReady: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: mixedReady,
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
    isReady: true,
  },
};

export const HostCanStart: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: allReady,
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
    isReady: true,
    allPlayersReady: true,
    canStartQuiz: true,
  },
};

// ── Step 2: waiting room, as a guest ───────────────────────────────────────────
export const GuestWaitingForHostToPickQuiz: Story = {
  args: {
    isHost: false,
    hasJoined: true,
    sessionId: "AB12CD",
    participants: guestRoster,
    hasSelectedQuiz: false,
  },
};

export const GuestReadyWaitingForHost: Story = {
  args: {
    isHost: false,
    hasJoined: true,
    sessionId: "AB12CD",
    participants: guestRoster,
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
    isReady: true,
  },
};

// ── Overlays on top of the lobby ───────────────────────────────────────────────
export const QuizPickerOpen: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: solo,
    hasSelectedQuiz: false,
    quizSelectionDialogSlot: openQuizSelectionDialog,
  },
};

export const LeaveConfirmationOpen: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: mixedReady,
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
    manualLeaveDialog: { isOpen: true, onConfirm: fn(), onCancel: fn() },
  },
};

// ── A lobby with an active conversation ────────────────────────────────────────
export const WithChatConversation: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    participants: mixedReady,
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
    chatSlot: populatedChat,
  },
};

// ── A larger lobby (maxPlayers scaled up from the default 6 to 10) ─────────────
export const ScaledUpToTenPlayers: Story = {
  args: {
    hasJoined: true,
    sessionId: "AB12CD",
    maxPlayers: 10,
    participants: [
      ...mixedReady,
      { username: "Grace", isHost: false, isReady: true, profileImageUrl: null },
      { username: "Turing", isHost: false, isReady: false, profileImageUrl: null },
    ],
    hasSelectedQuiz: true,
    selectedQuiz: chemistryQuiz,
  },
};
