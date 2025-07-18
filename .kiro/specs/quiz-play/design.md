# Quiz Play Feature Design

## Overview

The Quiz Play feature will enable users to interact with quizzes by answering questions, receiving feedback, tracking progress, and viewing results. This design document outlines the architecture, components, data models, and implementation approach for the Quiz Play feature.

Based on the analysis of the existing codebase, we've identified several issues that need to be fixed:

1. **True/False Question Handling**: The backend maps True/False questions to options with IDs 1 (True) and 0 (False), but the frontend doesn't handle this correctly. The `QuizSessionMappingProfile.cs` creates these options, but the frontend's `question-display.tsx` component doesn't have special handling for True/False questions.

2. **Type The Answer Questions**: The frontend doesn't have a UI component for text input questions. The backend expects a `submittedAnswer` string for these questions, but the frontend only sends `selectedOptionId`.

3. **Infinite Loop Issue**: When a question times out, there's a "Maximum update depth exceeded" error. This is likely caused by the `QuizTimer` component triggering multiple state updates when time runs out.

4. **Feedback Display**: The `AnswerFeedback` component uses a fallback for feedback details instead of showing the correct feedback. This might be due to incorrect mapping of the `AnswerStatus` enum between backend and frontend.

5. **Question Type Identification**: The frontend doesn't receive information about the question type (MultipleChoice, TrueFalse, TypeTheAnswer) from the backend, making it impossible to render the appropriate UI.

In addition to fixing these issues, we'll implement the remaining quiz interaction, progress tracking, and results components as specified in the requirements.

## Architecture

The Quiz Play feature will follow the existing application architecture, which uses:

- React for the UI components
- TypeScript for type safety
- React Query for server state management
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations

The feature will be organized into the following layers:

1. **UI Components**: React components for displaying questions, answers, feedback, and results
2. **State Management**: React Query hooks for managing server state and local state for UI interactions
3. **API Layer**: Functions for interacting with the backend API
4. **Routing**: React Router configuration for quiz flow navigation

## Components and Interfaces

### 1. Quiz Session Flow

The quiz session flow will consist of the following screens:

1. **Quiz Selection** (already implemented)
2. **Quiz Play Interface**:
   - Question Display
   - Answer Options (Multiple Choice, True/False, Type The Answer)
   - Timer
   - Progress Indicator
3. **Answer Feedback**:
   - Correct/Incorrect/Timed Out feedback
   - Explanation for correct answer
   - Points awarded
4. **Quiz Results**:
   - Summary of performance
   - Score breakdown
   - Review of answers
   - Options to retry or select new quiz

### 2. Component Hierarchy

```
QuizPageRouteWrapper
└── QuizPage
    ├── QuizInterface
    │   ├── QuestionDisplay
    │   │   ├── MultipleChoiceQuestion
    │   │   ├── TrueOrFalseQuestion
    │   │   └── TypeTheAnswerQuestion
    │   ├── QuizTimer
    │   ├── QuizProgress
    │   └── AnswerFeedback
    └── QuizResults
        ├── ScoreSummary
        ├── AnswerReview
        └── ActionButtons
```

### 3. Component Specifications

#### QuizPageRouteWrapper

- Handles route parameters and authentication
- Loads quiz data and initializes the quiz session

#### QuizPage

- Manages the overall quiz state
- Coordinates API calls for session creation, question retrieval, and answer submission
- Handles transitions between questions and results

#### QuizInterface

- Displays the current question or feedback
- Manages the UI state for the active quiz session

#### QuestionDisplay

- Renders the appropriate question type component based on question data
- Handles answer selection and submission

#### Question Type Components

- **MultipleChoiceQuestion**: Displays multiple choice options
- **TrueOrFalseQuestion**: Displays True/False options
- **TypeTheAnswerQuestion**: Provides text input for free-form answers

#### QuizTimer

- Displays countdown timer for each question
- Triggers automatic submission when time expires

#### QuizProgress

- Shows progress through the quiz (e.g., "Question 3 of 10")
- Displays visual progress indicator

#### AnswerFeedback

- Shows feedback after answering a question
- Displays correct answer and explanation
- Provides button to proceed to next question

#### QuizResults

- Displays final score and performance metrics
- Shows breakdown of correct/incorrect answers
- Allows reviewing individual questions and answers
- Provides options to retry quiz or select a new one

## Data Models

We'll use the existing data models from the codebase and extend them as needed:

### Existing Models

```typescript
// Enums
export enum AnswerStatus {
  NotAnswered = "NotAnswered",
  Correct = "Correct",
  Incorrect = "Incorrect",
  TimedOut = "TimedOut",
}

export enum LiveQuizStatus {
  InProgress = "InProgress",
  BetweenQuestions = "BetweenQuestions",
  Completed = "Completed",
}

// DTOs
export interface AnswerOption {
  id: number;
  text: string;
}

export interface CurrentQuestion {
  quizQuestionId: number;
  questionText: string;
  options: AnswerOption[];
  timeLimitInSeconds: number;
  timeRemainingInSeconds: number;
}

export interface AnswerResult {
  status: AnswerStatus;
  scoreAwarded: number;
  isQuizComplete: boolean;
}

export interface QuizState {
  status: LiveQuizStatus;
  activeQuestion: CurrentQuestion | null;
}

export interface UserAnswer {
  id: number;
  sessionId: string;
  quizQuestionId: number;
  selectedOptionId: number | null;
  submittedAnswer: string | null;
  status: AnswerStatus;
  score: number;
  questionText: string;
  selectedOptionText: string | null;
}

export interface QuizSession {
  id: string;
  quizId: number;
  quizTitle: string;
  userId: string;
  startTime: string; // ISO date string
  endTime: string | null; // ISO date string
  totalScore: number;
  isCompleted: boolean;
  userAnswers: UserAnswer[];
}
```

### Extended Models

We'll extend the existing models to support the different question types:

```typescript
// Question Types
export enum QuestionType {
  MultipleChoice = "MultipleChoice",
  TrueOrFalse = "TrueOrFalse",
  TypeTheAnswer = "TypeTheAnswer",
}

// Extended CurrentQuestion
export interface ExtendedCurrentQuestion extends CurrentQuestion {
  questionType: QuestionType;
  explanation?: string; // Explanation for the correct answer
}

// Quiz Results
export interface QuizResults {
  sessionId: string;
  quizId: number;
  quizTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeoutAnswers: number;
  totalScore: number;
  maxPossibleScore: number;
  timeTaken: string; // formatted time
  answers: UserAnswer[];
}
```

## API Integration

We'll use the existing API endpoints and extend them as needed:

### Existing Endpoints

- `POST /quizsessions`: Create a new quiz session
- `GET /QuizSessions/{sessionId}/current-state`: Get the current state of a quiz session
- `GET /QuizSessions/{sessionId}/next-question`: Get the next question in a quiz session
- `POST /QuizSessions/answer`: Submit an answer for a question

### New Endpoints

- `GET /QuizSessions/{sessionId}/results`: Get detailed results for a completed quiz session
- `PUT /QuizSessions/{sessionId}/abandon`: Mark a quiz session as abandoned

## State Management

We'll use React Query for server state management and local React state for UI interactions:

### Server State

- Quiz session data
- Current question
- Answer results
- Quiz results

### Local State

- Selected answer
- Timer state
- UI feedback state
- Navigation state

## Error Handling

The feature will handle the following error scenarios:

1. **Session Creation Failure**: Display error message and redirect to quiz selection
2. **Question Loading Failure**: Retry with exponential backoff, then show error with option to restart
3. **Answer Submission Failure**: Allow retrying submission, preserve user's answer
4. **Network Disconnection**: Save state locally and attempt to reconnect
5. **Session Timeout**: Handle expired sessions with appropriate user feedback

## Accessibility

The Quiz Play feature will be designed with accessibility in mind:

1. **Keyboard Navigation**: All interactive elements will be keyboard accessible
2. **Screen Reader Support**: Proper ARIA attributes and semantic HTML
3. **Color Contrast**: Ensure sufficient contrast for text and UI elements
4. **Focus Management**: Clear focus indicators and logical tab order
5. **Responsive Design**: Adapt to different screen sizes and orientations

## Testing Strategy

The feature will be tested using the following approaches:

1. **Unit Tests**:

   - Test individual components in isolation
   - Verify component behavior with different props and states
   - Test utility functions and hooks

2. **Integration Tests**:

   - Test component interactions
   - Verify API integration with mock responses
   - Test navigation flow

3. **End-to-End Tests**:
   - Test complete quiz flow from selection to results
   - Verify correct handling of different question types
   - Test error scenarios and edge cases

## Implementation Considerations

1. **Performance Optimization**:

   - Minimize re-renders using React.memo and useMemo
   - Optimize API calls with proper caching strategies
   - Lazy load components as needed

2. **Mobile Responsiveness**:

   - Design UI components to work well on both desktop and mobile
   - Use responsive design patterns for different screen sizes

3. **Animation and Transitions**:

   - Use Framer Motion for smooth transitions between questions
   - Add subtle animations for feedback and results

4. **Offline Support**:
   - Consider implementing basic offline support for in-progress quizzes
   - Store quiz state locally to prevent data loss

## Future Enhancements

While not part of the initial implementation, the following enhancements could be considered for future iterations:

1. **Quiz Analytics**: Detailed performance analytics and learning insights
2. **Social Sharing**: Share quiz results on social media
3. **Leaderboards**: Compare scores with other users
4. **Adaptive Difficulty**: Adjust question difficulty based on user performance
5. **Rich Media Questions**: Support for images, audio, and video in questions
