# Multiplayer Feature Analysis

This document provides a comprehensive analysis of the current multiplayer implementation in OxygenQuiz, identifying its components, architecture, weaknesses, and necessary next steps.

## 1. Overview
The multiplayer feature allows users to join a real-time lobby using a Session ID and their username. It leverages **SignalR** for real-time bidirectional communication between the client (React) and the server (ASP.NET Core).

## 2. Architecture

### Server-Side (Backend)
- **Technology**: ASP.NET Core SignalR.
- **Hub**: `QuizHub.cs` handles incoming connections and method invocations.
- **State Management**: **InMemoryQuizSessionManager** (Singleton).
    - Stores active sessions and participants in a `ConcurrentDictionary`.
    - **Host Logic**: The first user to join is assigned as **Host**. If the Host leaves, the next participant inherits the role.
    - **Ready State**: Tracks `IsReady` status for each participant.
- **Graceful Disconnection**:
    - Uses `OnDisconnectedAsync` to automatically remove users if they close their browser/tab.
    - Generates `UserLeft` and `CurrentParticipants` updates to keep everyone synced.

### Client-Side (Frontend)
- **Technology**: React, `@microsoft/signalr`.
- **State Management**: React Context (`MultiplayerContext`) manages the SignalR connection globally.
- **Components**:
    - `MultiplayerLobby`: UI for entering a session. 
        - **Host View**: Can see "Start Quiz" button (active when players are ready).
        - **Participant View**: Can click "Ready Up".
        - **Responsive Grid**: Displays users with statuses.

## 3. Workflow (Optimized)

1.  **Host Creation**:
    - Alice joins Session "123".
    - Server creates Session "123", assigns Alice as Host.
    - Alice sees "Start Quiz" (disabled until others join/ready).
2.  **Participant Joins**:
    - Bob joins Session "123".
    - Server adds Bob.
    - Both see updated list. Alice has Crown icon 👑.
3.  **Ready Phase**:
    - Bob clicks "Ready Up".
    - Server updates state, broadcasts `PlayerReadyChanged`.
    - Alice sees Bob is Ready.
4.  **Start Game**:
    - When 2+ players are present and ready, Alice clicks "Start Quiz".
    - Server verifies Alice is Host.
    - Server broadcasts `GameStarted`.
    - Clients navigate to the Quiz screen (Coming Soon).

## 4. UI & Experience
The lobby uses a professional, clean aesthetic based on ShadCN/UI:
- **Clean Colors**: Uses theme Primary/Secondary/Muted colors.
- **Visual Feedback**:
    - **Crown Icon**: Identifies the lobby host.
    - **Ready Status**: Green/Grey text indicators.
    - **Toast Notifications**: For joins, leaves, and ready toggles.

## 5. Remaining Weaknesses & Next Steps

### A. Game Logic (Next Priority)
- **Issue**: `StartGame` just broadcasts a message. The app doesn't effectively *go* anywhere yet because the actual "Quiz Page" multiplayer mode isn't built.
- **Consequence**: Users will just see a success notification but stay in the lobby.

### B. Security
- **Issue**: Any user can join with any name. No auth check against database.

## 6. Roadmap

### Phase 1: State & Lobby (Completed ✅)
- Session Persistence.
- Host Assignment & Transfer.
- Ready/Not Ready Logic.
- UI Polish.

### Phase 2: Game Loop (Next)
1.  **Handle `GameStarted`**:
    - Redirect users to `/quiz/play/{id}` or switch `MultiplayerLobby` view to `GameView`.
2.  **Synchronized Questions**:
    - Server sends Question 1 to all.
    - Clients display Question 1.
    - Clients submit answers.
    - Server waits for all answers (or timeout), then sends Results/Next Question.
