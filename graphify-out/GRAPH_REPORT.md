# Graph Report - OxygenQuiz  (2026-08-05)

## Corpus Check
- 995 files · ~1,605,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6205 nodes · 14666 edges · 554 communities (291 shown, 263 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 534 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cd1fdf0b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UI Card & Text Components
- File Upload & LLM API (frontend)
- Form & Select UI Primitives
- Background & Drawer UI
- Button & Notification UI
- Avatar Service (backend)
- REST Controller Base
- DataTable & Sheet UI
- Pagination & Audit-Log Queries
- Auth & App Bootstrap (frontend)
- Invite Codes API
- Questions API Controller
- Deployment Config & Secrets (docs)
- Runtime Dependencies
- Data Import/Export
- Answer Grading Service
- Question Versioning & Scoring
- Audit Logs Controller
- Question Service & Image Assoc.
- Backend Namespaces / Tests
- Quiz Session Service
- Build Tooling / Dev Deps
- Filtering & Pagination Framework
- Auth Controller & Rate Limiting
- User Service
- Question Models
- Audit & Repositories
- Filter UI Components
- Backend Service Namespaces
- Reports Service & Controller
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- known-issues.md
- IQuestionRepository
- Community 198
- Multiplayer
- LobbyPageView.stories.tsx
- ExternalAuthenticationTests
- .Generate
- Community 203
- Community 204
- Community 205
- Community 206
- AnswerGradingServiceTests
- Community 208
- Community 209
- Community 210
- type-the-asnwer-question-form.tsx
- .EffectiveElapsed
- ExternalLogin
- InviteCode
- get-public-quizzes.ts
- Implementation Plan — Google & Microsoft Sign-In (External Identity Providers)
- QuizAPI.Services.Scoring
- Responsive & Mobile Conventions
- Google & Microsoft Sign-In (External Identity Providers)
- Graphify knowledge graph
- Community 221
- create-question-difficulty.ts
- floating-avatar-cluster.tsx
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- ApplicationDbContext
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 238
- Community 240
- Community 241
- Community 242
- Community 247
- Community 255
- Community 256
- Community 257
- Community 258
- Community 259
- Community 261
- Community 262
- TopNotification.stories.tsx
- Proposal: partial credit for multi-select questions
- Guest play — one free singleplayer quiz, no account required
- Configuration & Settings — how OxygenQuiz reads its config
- VPS Launch Checklist (Hetzner backend + Cloudflare Pages frontend)
- Quiz editing & version pinning
- IImageService
- InviteCodeRepository
- Implementation Plan — Invite-Code Signup Gate
- Production Runbook — oxygenquiz.com on Hetzner
- Image Upload Flow (ImageAsset pipeline)
- Quiz Answer Submission & Grading
- IInviteCodeGenerator
- lobby-chat-view.tsx
- QuizHistoryList.tsx
- Generic File Storage (Files entity)
- Getting Started — Required Software & Setup
- ReportsController.cs
- Deployment Runbook — quick commands
- Audit Logging
- Rate Limiting
- Production Runbook — oxygenquiz.com on Hetzner
- StatsPanel.tsx
- OxygenQuiz — Session Handoff
- Account & Settings Overlay
- upload-file.ts
- enter-databases.md
- MongoDB — disabled (and how to bring it back)
- Reference data (importable)
- get-individual-question.ts
- QuizEditingVersioning
- Typed-answer matching
- QuestionDifficultyDTO
- Claude Code plugins
- CLAUDE.md
- Graphify Knowledge Graph
- AuthenticationService
- Refresh token (hashed, rotated)
- RefreshTokenRepository
- Silent refresh on 401
- Refresh token rotation / sliding session
- TokenService
- In-memory access-token store (token-store.ts)
- Two-token authentication scheme
- userAuthLoader / createAuthLoader
- Email verification (double opt-in)
- IEmailSender abstraction
- Soft gate (banner + resend)
- GuestAccount (shared placeholder account)
- GuestQuizSessionsController
- guest_played cookie (soft limit)
- IsGuestSessionAsync security check
- QuizSessionService (reused engine)
- QuizPageRouteWrapper (three-way branch)
- InviteCodesController (admin endpoints)
- InviteCodeGenerator (CSPRNG, hash)
- InviteCode entity (InviteCodes table)
- Atomic redemption (ExecuteUpdateAsync)
- Store code hash not plaintext
- Invite-Code Signup Gate — design plan
- InviteCodeRepository (TryConsumeAsync)
- Signup:RequireInviteCode feature flag
- Invite-Code Signup Gate (as built)
- validate-invite-code advisory endpoint
- accessTokenFactory (JWT to hub)
- Login required to play + account identity
- multiplayer-context.tsx (connection)
- QuizHub (SignalR, [Authorize])
- Server-derived username from Context.User
- change-user-role.tsx dialog
- SuperAdmin privilege-escalation gate
- Changing a user's role
- ForbiddenException (403 mapping)
- Last-SuperAdmin lockout guard
- IUserService.SetUserRolesAsync
- oxygen-postgres dev container
- Idempotent import (skip duplicates)
- Quiz Status (Draft/Unlisted/Public)
- MongoDB disabled (ephemeral chat)
- InMemoryQuizSessionManager (RecentMessages)
- LobbyChatArchiver (write-only sink)
- .NET Config Layering (appsettings precedence)
- Configuration & Settings Guide
- .env.prod Secrets File
- Double-Underscore Env Var Nesting
- Deployment & Go-Live Runbook (strategy)
- Security__EnforceProductionConfig Gate
- Hangfire Background Jobs
- Serverless/Lambda Unsuitable for Backend
- Hangfire IRecurringJobManager Scheduling Fix
- Deployment Runbook (quick commands)
- docker-compose.prod.yml
- SignalR (WebSocket hubs)
- Single Always-On Instance Constraint
- Cloudflare Worker (oxygenquiz static assets)
- Frontend Deploy Explained
- VITE_API_URL (build-time API URL)
- workers.dev subdomain (deploy target)
- Wrangler CLI
- wrangler.jsonc deploy config
- Cloudflare (edge: DNS/CDN/DDoS/TLS)
- ASP.NET Data Protection Keys (dpkeys volume)
- Infrastructure & Deployment Architecture
- Docker (compose stack)
- .NET 8 Backend (QuizAPI)
- Forwarded Headers (UseForwardedHeaders)
- Cloudflare Full (strict) TLS mode
- Hetzner VPS (Helsinki CX23)
- MatchOrchestrator / InMemoryQuizSessionManager
- MongoDB Removed from Production
- Docker Named Volumes (postgres-data/uploads/dpkeys)
- Nginx Reverse Proxy
- Cloudflare Origin Certificate
- PostgreSQL (primary data store)
- Spaceship Registrar / Cloudflare Nameservers
- Committed mkcert Private Keys in certs/
- EF Migrations Run at Startup (multi-instance race)
- Stale CORS Origins in appsettings.Production.json
- Wrangler Stale-Bundle Deploy Bug (409/workers_dev)
- Caddy Reverse Proxy (alt topology)
- Production Runbook (Caddy variant)
- VPS Launch Checklist
- Lock Origin Firewall to Cloudflare IP Ranges
- AuditLog (append-only entity)
- IAuditService.LogAsync
- Audit Logging Guide
- CF-Connecting-IP Client IP Trust
- Rate Limiting Guide
- RateLimitingExtensions (.NET 8 limiter)
- Storybook Guide
- Prop-Driven Component Storyability
- Storybook (component workbench)
- CI Deploy Gate (tests.yml)
- Testing Guide
- EF Core InMemory (throwaway DB)
- Moq (mocking)
- Playwright (E2E, not yet configured)
- Vitest + Testing Library
- xUnit (test runner)
- IAuditService / AuditActions
- Granular permissions model (resource:action)
- Open security gaps (public user reads)
- Session Handoff
- Two dashboards (admin / user)
- UserSettings entity + SettingsApplier
- AvatarService (avatar change)
- Generic File Storage Guide
- FileRecord Store (attach-on-upload)
- FilesController / FileService
- Image Upload Flow Guide
- ImageCleanUpService (daily Hangfire sweep)
- ImageUploadController / ImageService
- ImageAsset Pipeline (draft-aware)
- FilterEngine
- FilterFieldSet Whitelist
- FilterQuery
- Filtering, Sorting & Pagination Framework
- Frontend filter-builder (src/lib/filtering)
- PagedResponse Body Envelope
- restrictToUserId Ownership Clamp
- Filter Safety Model
- Filter Wire Format
- Derived State Pattern
- Multiplayer Feature
- MultiplayerContext
- MultiplayerLobby Component
- IQuizClient
- QuizHub (SignalR Hub)
- InMemoryQuizSessionManager
- Multiplayer Lobby Join Flow
- Lobby Page Owns the Single Join
- useLobbyConnection
- Legacy ImageUrl Back-Compat
- Question Media (images, audio, video)
- FileRecord / FileService
- ImageAsset / ImageService (legacy)
- QuestionMediaType Enum
- QuestionMedia Component
- Category Interleaving Rationale
- variety Pseudo Sort Field
- QuizVarietyOrdering
- QuizService.SearchQuizzesAsync
- Quiz Discovery Variety Ordering
- Copy-on-Write QuizQuestion Versioning
- QuizQuestionVersioning.Diff
- Session Version Pinning
- QuizService.UpdateQuizAsync
- Quiz Editing & Version Pinning
- AnswerGradingService
- Hangfire Background Grading
- CurrentQuestionDto
- MatchOrchestrator (multiplayer)
- QuizScoring (speed-weighted)
- QuizSessionService
- UserAnswerCM
- CanHostQuizAsync / QuizHub.SelectQuiz
- EF Core Global Query Filter
- QuizStatus (Draft/Unlisted/Public)
- ShareToken
- Quiz Visibility & Sharing
- IDataExportService
- Export Reflects Screen Rows
- Question Analytics Report
- Quiz Performance Report
- ReportService / IReportService
- AI Microservice (Python/FastAPI + Ollama)
- Auto migration + seeding on startup
- Backend API (ASP.NET Core .NET 8)
- Docker Compose setup
- Frontend (React 18 + Vite 5)
- Getting Started Guide
- PostgreSQL (primary database)
- .NET user-secrets config
- authRequestInterceptor
- Auth.tsx (Authentication Logic)
- AnswerStatus Enum
- Quiz Play Component Hierarchy
- Timer Infinite Loop Issue
- QuestionType (MultipleChoice/TrueOrFalse/TypeTheAnswer)
- Quiz Play Feature
- QuizSession Model
- QuizSessionMappingProfile
- True/False Question Handling
- QuizSessionCleanupService
- AuthenticationService
- FileService
- FileRecord Entity
- HttpOnly Refresh Token Cookie
- ImageService/ImageAsset Pattern
- Many-to-Many Roles + ProblemDetails Contract
- Refresh-on-401 Axios Interceptor
- RefreshToken Entity
- TokenService
- AWS Fargate/ECS Deployment
- FastAPI LLM Microservice
- Fail-Fast Secrets Configuration
- categories.json
- Category Color Palette (ColorPaletteJson)
- difficulties.json
- languages.json
- Reference Data (importable)
- create-quiz-method-dialog.stories.tsx
- quiz-timer.tsx
- Dynamic Reports
- NotACommonPasswordAttribute
- mode-card.tsx
- Import templates
- Favicon
- Quiz question classification
- SettingsFilesAuditLogsRolePermission
- AuditLogs_Notifications_RetireUpdatedAt
- AddUserSettings
- Fix_RolePermissions_ShadowFK
- AddFontSetting
- FixUserRoleRelationship
- RemoveUniversitetiDrejtimi
- AddQuizSoftDelete
- AddQuestionAndFileMedia
- AddEmailVerification
- AddGuestQuizSessions
- AddExternalLogins
- RescaleScoresToHighResolutionBase
- generate-favicon.py
- 20251225173303_InitialCreate.Designer.cs
- 20260606084508_Settings-Files-AuditLogs-RolePermission.Designer.cs
- 20260606131927_AuditLogs_Notifications_RetireUpdatedAt.Designer.cs
- 20260608210338_Fix_RolePermissions_ShadowFK.Designer.cs
- 20260609193513_AddFontSetting.Designer.cs
- 20260612120000_RemoveUniversitetiDrejtimi.Designer.cs
- 20260615120000_AddQuizSoftDelete.Designer.cs
- 20260618203133_AddQuestionAndFileMedia.Designer.cs
- 20260620222311_AddEmailVerification.Designer.cs
- 20260622193358_AddGuestQuizSessions.Designer.cs
- 20260626191712_ReworkQuizVisibilityToStatus.Designer.cs
- 20260628202215_AddInviteCodes.Designer.cs
- 20260702170817_QuizEditingVersioning.Designer.cs
- 20260726102121_AddExternalLogins.Designer.cs
- 20260728120000_RescaleScoresToHighResolutionBase.Designer.cs
- msal.ts
- refreshAccessToken

## God Nodes (most connected - your core abstractions)
1. `cn()` - 133 edges
2. `QuizAPI.Models` - 95 edges
3. `Button` - 86 edges
4. `ApplicationDbContext` - 80 edges
5. `useNotifications` - 71 edges
6. `QuestionType` - 64 edges
7. `QuizAPI.Data` - 60 edges
8. `Result` - 50 edges
9. `Card` - 47 edges
10. `api` - 46 edges

## Surprising Connections (you probably didn't know these)
- `Storybook Google Fonts Preload` --semantically_similar_to--> `Google Fonts (App)`  [INFERRED] [semantically similar]
  .storybook/preview-head.html → index.html
- `Production Docker Compose Stack` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  deploy/docker-compose.prod.yml → docker-compose.yml
- `Dev PostgreSQL Container` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  docker-compose.dev.yml → docker-compose.yml
- `useFormField()` --references--> `react`  [EXTRACTED]
  src/components/ui/form/form.tsx → package.json
- `ColorCard()` --references--> `react`  [EXTRACTED]
  src/common/ColouredCard.tsx → package.json

## Import Cycles
- None detected.

## Communities (554 total, 263 thin omitted)

### Community 0 - "UI Card & Text Components"
Cohesion: 0.07
Nodes (28): 10. Known follow-ups, 11. Dependency, 1. Overview, 2. Core concepts, 3. File-by-file, 4. Where each sound is triggered, 5. How to use it in new code, 6. Adding a new sound (+20 more)

### Community 1 - "File Upload & LLM API (frontend)"
Cohesion: 0.21
Nodes (11): createQuestionLanguage(), CreateQuestionLanguageInput, createQuestionLanguageInputSchema, useCreateQuestionLanguage(), UseCreateQuestionLanguageOptions, deleteQuestionLanguage(), DeleteQuestionLanguageDTO, useDeleteQuestionLanguage() (+3 more)

### Community 2 - "Form & Select UI Primitives"
Cohesion: 0.07
Nodes (60): FormDrawer(), Form(), Label, SelectContent, SelectContentProps, SelectItem, SelectItemProps, SelectLabel (+52 more)

### Community 3 - "Background & Drawer UI"
Cohesion: 0.07
Nodes (70): DataTable(), LoadingWave(), PaginationControls(), SheetContent, SheetContentProps, SheetDescription, SheetHeader(), SheetOverlay (+62 more)

### Community 4 - "Button & Notification UI"
Cohesion: 0.05
Nodes (61): BackButtonProps, LIFT_COLOR_TOKENS, LiftColorToken, LiftedButton, LiftedButtonProps, useNotifications, Button, ConfirmationDialog() (+53 more)

### Community 5 - "Avatar Service (backend)"
Cohesion: 0.07
Nodes (45): BaseApiController, CancellationToken, Guid, IFormFile, Task, IAvatarService, CancellationToken, Guid (+37 more)

### Community 6 - "REST Controller Base"
Cohesion: 0.06
Nodes (41): ActionResult, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+33 more)

### Community 7 - "DataTable & Sheet UI"
Cohesion: 0.09
Nodes (23): 10a. Per-flow persistence semantics (deliberate divergence), 11. Maintainability & known seams, 12. Making new question types cheap (a path, not a task), 13. Summary of guarantees, 1. What this feature is, in one paragraph, 2. Component map, 3. The data pipeline (happy path), 4. Trust boundaries and defense in depth (+15 more)

### Community 8 - "Pagination & Audit-Log Queries"
Cohesion: 0.07
Nodes (48): cleanQueryParams(), extractPaginationFromHeaders(), AuditLogsResult, getAuditLogs(), GetAuditLogsParams, getAuditLogsQueryOptions(), useAuditLogsData(), getMultipleChoiceQuestions() (+40 more)

### Community 9 - "Auth & App Bootstrap (frontend)"
Cohesion: 0.09
Nodes (22): userAuthLoader, RedirectIfLoggedIn(), AboutUs, AccessDeniedPage, AiQuizWizard, AppRoot, ConfirmEmail, DashboardErrorElement (+14 more)

### Community 10 - "Invite Codes API"
Cohesion: 0.22
Nodes (7): Fact, IConfiguration, InlineData, Mock, Task, Theory, AuthenticationServiceTests

### Community 11 - "Questions API Controller"
Cohesion: 0.13
Nodes (19): Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, Task (+11 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (55): dependencies, @azure/msal-browser, class-variance-authority, clsx, date-fns, framer-motion, gsap, @gsap/react (+47 more)

### Community 14 - "Data Import/Export"
Cohesion: 0.20
Nodes (10): howler, AudioPrefsStore, useAudioStore, audio, AudioManager, AudioProvider(), MusicName, N (+2 more)

### Community 15 - "Answer Grading Service"
Cohesion: 0.12
Nodes (21): Task, ISubmitAnswerService, Guid, ILogger, QuizSessionOptions, Task, SubmitAnswerService, AnswerResultDto (+13 more)

### Community 16 - "Question Versioning & Scoring"
Cohesion: 0.23
Nodes (8): DiffResult, IEnumerable, IReadOnlyCollection, QuizQuestionVersioning, QuizQuestionUM, Fact, int, QuizQuestionVersioningTests

### Community 17 - "Audit Logs Controller"
Cohesion: 0.15
Nodes (13): CancellationToken, IQueryable, IReadOnlyList, Items, Task, Total, IAuditLogRepository, CancellationToken (+5 more)

### Community 18 - "Question Service & Image Assoc."
Cohesion: 0.15
Nodes (11): CancellationToken, Expression, Func, Guid, IQueryable, List, string, Task (+3 more)

### Community 19 - "Backend Namespaces / Tests"
Cohesion: 0.09
Nodes (18): QuizAPI.Tests.Editing, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService, QuizAPI.Controllers.Quizzes.Services.QuizServices, QuizAPI.Common, QuizAPI.Controllers.Users.Services.UserStatsService, QuizAPI.Controllers.Quizzes, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService, QuizAPI.Mapping (+10 more)

### Community 20 - "Quiz Session Service"
Cohesion: 0.15
Nodes (11): List, IResult, Result, Guid, ILogger, int, Task, QuizSessionService (+3 more)

### Community 21 - "Build Tooling / Dev Deps"
Cohesion: 0.04
Nodes (45): devDependencies, autoprefixer, baseline-browser-mapping, @chromatic-com/storybook, cross-env, esbuild, eslint, @eslint/js (+37 more)

### Community 22 - "Filtering & Pagination Framework"
Cohesion: 0.29
Nodes (7): Multiplayer lobby join flow, Related, Room codes, The bug this replaced, The two URL shapes (both supported), When the join fails, Who performs the join

### Community 23 - "Auth Controller & Rate Limiting"
Cohesion: 0.20
Nodes (14): AllowAnonymous, Authorize, CancellationToken, DateTime, EnableRateLimiting, HttpGet, HttpPost, IActionResult (+6 more)

### Community 24 - "User Service"
Cohesion: 0.14
Nodes (15): CancellationToken, Guid, HashSet, IEnumerable, IQueryable, IReadOnlyList, Task, UserService (+7 more)

### Community 25 - "Question Models"
Cohesion: 0.12
Nodes (20): QuizAPI.Models.Statistics.Questions, DateTime, Guid, ICollection, List, MultipleChoiceQuestion, QuestionBase, QuestionMediaType (+12 more)

### Community 26 - "Audit & Repositories"
Cohesion: 0.11
Nodes (9): QuizAPI.Controllers.Image.Services, QuizAPI.DTOs.Audit, QuizAPI.Repositories, QuizAPI.Data, QuizAPI.Models, QuizAPI.Controllers.Audit, QuizAPI.Repositories.Interfaces, QuizAPI.Controllers.Roles (+1 more)

### Community 27 - "Filter UI Components"
Cohesion: 0.09
Nodes (39): ActiveFilterPill, ActiveFilterPills(), ActiveFilterPillsProps, DateRangeFilter(), DateRangeFilterProps, MultiSelect(), MultiSelectOption, MultiSelectProps (+31 more)

### Community 28 - "Backend Service Namespaces"
Cohesion: 0.10
Nodes (12): QuizAPI.Filtering, QuizAPI.Controllers.Questions.Services, QuizAPI.Controllers.DataTransfer, QuizAPI.Extensions, QuizAPI.Services.CurrentUserService, QuizAPI.Controllers.Questions.Services.AnswerOptions, QuizAPI.DTOs.Shared, QuizAPI.DTOs.Question (+4 more)

### Community 29 - "Reports Service & Controller"
Cohesion: 0.19
Nodes (14): CancellationToken, HttpGet, HttpPost, IActionResult, List, Task, ReportsController, QuestionAnalyticsRow (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (13): FileContentResult, Authorize, CancellationToken, HttpGet, HttpPost, IActionResult, IFormFile, List (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (7): CancellationToken, Guid, List, Task, IQuizService, QuizDTO, QuizQuestionDTO

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (19): DateTime, Guid, ICollection, QuestionCategory, QuestionDifficulty, QuestionLanguage, User, Quiz (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.04
Nodes (60): AiQuizWizard(), AiQuizWizardView(), AiWizardStep, ALL_AI_QUESTION_TYPES, QUESTION_TYPE_LABELS, ALL_INVALID_REPLY, categories, difficulties (+52 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): 10. Edge cases & failure modes, 11. Concrete file change list, 12. Decisions made, 1. Goal, 2. The central problem, and why it mostly disappears, 2a. Why not `Unspecified`?, 2b. Difficulty resolution — strict, and incapable of creating entities, 2c. Per-question scoring (`pointSystem`, `timeLimitInSeconds`) (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (18): Guid, Task, IQuizSessionService, AnswerOptionForQuizPlaying, DateTime, Guid, List, TimeSpan (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (10): List, CancellationToken, DateTime, IHubContext, ILogger, int, IServiceScopeFactory, List (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (25): borderColors, icons, Notification(), NotificationProps, Error, Info, meta, Story (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (35): QuestionMedia(), QuestionMediaProps, MultiplayerQuestionView(), toCurrentQuestion(), FeedbackDisplay(), FeedbackDisplayProps, QuestionCard(), QuestionCardProps (+27 more)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (12): getPermissionMatrix(), getPermissionMatrixQueryOptions(), permissionMatrixQueryKey, usePermissionMatrix(), updateRolePermission(), UpdateRolePermissionInput, useUpdateRolePermission(), UseUpdateRolePermissionOptions (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.09
Nodes (37): MultipleChoiceQuestionCard(), MultipleChoiceQuestionCardProps, MultipleChoiceQuestionList(), MultipleChoiceQuestionListProps, UpdateMultipleChoiceQuestionFormProps, DeleteUserProps, BaseQuestionCard(), BaseQuestionCardProps (+29 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (15): AllowAnonymous, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (17): usersLoader(), createUser(), CreateUserInput, createUserInputSchema, useCreateUser(), UseCreateUserOptions, deleteUser(), DeleteUserDTO (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (22): QuizAPI.DTOs.Settings, QuizAPI.Services.SettingsService, QuizAPI.Controllers.Settings, CancellationToken, HttpGet, HttpPut, IActionResult, Task (+14 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (16): CancellationToken, Guid, IConfiguration, IEnumerable, string, Task, AuthenticationService, string (+8 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (29): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_URLS (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (18): TabsContent, TabsList, TabsTrigger, QuestionReview(), exportReport(), fetchQuestionAnalytics(), fetchQuizPerformance(), QuestionAnalyticsRow (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (8): Exception, Guid, IServiceProvider, Task, QuizHub, IReadOnlyList, Task, IQuizSessionManager

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (28): AiImportAnswerOption, AiImportQuestion, AiQuizImportInput, createAiQuiz(), useCreateAiQuiz(), UseCreateAiQuizOptions, QuizProperties(), QuizPropertiesProps (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (12): QuizAPI.Controllers.Image, IImageFormat, HttpPost, IActionResult, IFormFile, ILogger, int, IWebHostEnvironment (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.30
Nodes (11): IActionResult, BaseApiController, Authorize, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (10): DateTime, Guid, AuditLog, CancellationToken, IQueryable, IReadOnlyList, Items, Task (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.07
Nodes (36): DataTableProps, columns, Default, Empty, NarrowViewport, QuizRow, quizzes, SingleRow (+28 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (12): Dictionary, CategoryFilterFields, QuestionFilterFields, QuizFilterFields, UserFilterFields, IQueryable, LambdaExpression, HashSet (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (14): QuizAPI.Controllers.Totals, QuizAPI.Services, ActionResult, HttpGet, TotalsController, ModelBuilder, DashboardService, Guid (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (25): ChatApp.Models, ChatApp.DTOs, ChatMemberPresenceDto, ChatRoomDto, ChatRoomMemberDto, ChatUserRef, CreateChatRoomRequest, JoinRoomRequest (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (10): QuizAPI.Chat_System.Services, ConnectionService, ConcurrentDictionary, Guid, IEnumerable, Task, Guid, IEnumerable (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (23): Alert, AlertDescription, AlertTitle, alertVariants, RadioGroup, RadioGroupItem, testQuestion(), TestQuestionInput (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (9): CancellationToken, HttpGet, IActionResult, Task, AuditLogsController, DateTime, Guid, AuditLogDTO (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (17): AutomaticRetry, IBackgroundJobClient, IsCorrect, DateTime, Guid, HashSet, ILogger, IServiceScopeFactory (+9 more)

### Community 60 - "Community 60"
Cohesion: 0.11
Nodes (18): CancellationTokenSource, ConcurrentDictionary, int, IReadOnlyList, List, string, Task, InMemoryQuizSessionManager (+10 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (19): QuizAPI.Services.AuthenticationService, QuizAPI.DTOs.Notification, QuizAPI.Services.Invitations, QuizAPI.Tests.Auth, QuizAPI.Controllers.Notifications.Services, QuizAPI.Tests.Users, QuizAPI.Controllers.Authentication, QuizAPI.DTOs.Authentication (+11 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (17): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (17): Guid, ILogger, List, string, Task, QuizService, QuizStatus, CancellationToken (+9 more)

### Community 64 - "Community 64"
Cohesion: 0.06
Nodes (43): GoBackButton(), InputField(), InputFieldProps, O2Button(), StepsProps, ModeToggle(), ModeToggleProps, AuthConfig (+35 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (14): CancellationToken, ErrorMessage, Guid, IsCustomMessage, List, Success, Task, IQuestionService (+6 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (12): 1. The 60-second mental model, 2. The env files — what they are and which is which, 3. How you get real error messages in development, 4. Follow `VITE_API_URL` from the code all the way to the VPS, 5. "Why a domain and not just the raw VPS IP?", 6. Quick reference, Common gotchas, Frontend Environments, Explained (dev vs prod, env files, and how the API URL reaches the VPS) (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (11): DateTime, Guid, ICollection, User, CancellationToken, Guid, IEnumerable, IQueryable (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.06
Nodes (46): DrawerHeaderContent(), ProfileButton, ProfileButtonProps, Avatar, AvatarFallback, AvatarImage, difficultyRank(), useQuizCardModel() (+38 more)

### Community 69 - "Community 69"
Cohesion: 0.04
Nodes (68): ColorCard(), ColorCardProps, DrawerContent, DrawerContentProps, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay (+60 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (18): useGuestQuizSession(), UseGuestQuizSessionParams, createGuestQuizSession(), finishGuestSession(), getGuestCanPlay(), getGuestNextQuestion(), getGuestSessionResults(), submitGuestAnswer() (+10 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (6): Stream, Task, IImageService, ILogger, Task, ImageCleanUpService

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (4): Func, IEnumerable, List, QuizSessionMappers

### Community 73 - "Community 73"
Cohesion: 0.08
Nodes (32): hubErrorMessage(), JoinFailureReason, MultiplayerContext, MultiplayerContextType, MultiplayerProvider(), SessionAvailability, API_BASE, useNotificationHub() (+24 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (15): ControllerBase, Task, ITestQuestionService, ILogger, Task, TestQuestionService, ActionResult, HttpPost (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.06
Nodes (46): react, ButtonProps, buttonVariants, FancyButtonColors, ConfirmationDialogProps, Danger, Info, meta (+38 more)

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (15): HttpResponse, CancellationToken, IQueryable, DateTime, QuizSummaryDTO, HttpExtensions, Guid, int (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (22): BCrypt.Net-Next (4.0.3), Bogus (35.6.1), ClosedXML (0.105.0), CsvHelper (33.0.1), Hangfire.AspNetCore (1.8.21), Hangfire.PostgreSql (1.20.13), Microsoft.AspNetCore.Authentication.JwtBearer (8.0.20), Microsoft.AspNetCore.SignalR (1.2.0) (+14 more)

### Community 78 - "Community 78"
Cohesion: 0.13
Nodes (18): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+10 more)

### Community 79 - "Community 79"
Cohesion: 0.14
Nodes (13): ActivityTimeout, Guid, List, Task, ISessionAbandonmentService, Guid, ILogger, List (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.14
Nodes (15): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+7 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (16): Guid, List, Task, IUserAnswerService, Guid, ILogger, List, Task (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (15): DateTime, Guid, List, AnswerOptionDTO, IndividualQuestionDTO, MultipleChoiceQuestionCM, MultipleChoiceQuestionUM, QuestionBaseCM (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (20): contentVersion, metadata, _dependencyType, description, _parameterType, parameters, resourceGroupLocation, resourceGroupName (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.15
Nodes (7): List, string, TypeTheAnswerMatcher, Fact, InlineData, Theory, TypeTheAnswerMatcherTests

### Community 85 - "Community 85"
Cohesion: 0.14
Nodes (11): QuizAPI.MongoDB.Models, IMongoCollection, DateTime, LobbyChatLog, ILogger, string, ILobbyChatArchiver, LobbyChatArchiver (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.17
Nodes (14): QuizAPI.DTOs.Permission, ActionResult, CancellationToken, HttpDelete, HttpGet, HttpPost, IActionResult, string (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.16
Nodes (18): End, From, DateTime, List, AttemptsByDayPoint, QuizAnalyticsDto, QuizQuestionAnalyticsRow, ReportCriteria (+10 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (5): DateTime, IReadOnlyList, List, Task, IQuizClient

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (11): DateTime, Guid, EmailVerificationToken, CancellationToken, Guid, Task, EmailVerificationTokenRepository, CancellationToken (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 91 - "Community 91"
Cohesion: 0.18
Nodes (8): QuizAPI.Services.QuizSessionServices, QuizAPI.Hubs, QuizAPI.Services.Interfaces, QuizAPI.Hubs.Clients, Hub, Task, INotificationClient, NotificationHub

### Community 92 - "Community 92"
Cohesion: 0.13
Nodes (17): QuizAPI.DTOs.DataTransfer, DateTime, Guid, List, CategoryExportRow, CategoryImportRow, DifficultyExportRow, DifficultyImportRow (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.08
Nodes (36): CreateQuizInput, ParsedQuestion, NewQuizQuestionCardProps, MultipleChoiceFormCardProps, TrueFalseFormCardProps, TypeTheAnswerFormCardProps, NewMultipleChoiceOptions(), NewMultipleChoiceOptionsProps (+28 more)

### Community 94 - "Community 94"
Cohesion: 0.32
Nodes (7): ConstantExpression, MethodInfo, Expression, Func, IReadOnlyList, Type, FilterEngine

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (10): IMemoryCache, CancellationToken, Guid, HashSet, IQueryable, string, Task, TimeSpan (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.17
Nodes (11): CancellationToken, Guid, HashSet, IFormFile, ILogger, IReadOnlyList, IWebHostEnvironment, long (+3 more)

### Community 97 - "Community 97"
Cohesion: 0.18
Nodes (11): IEnumerable, List, Task, AnswerOptionService, IEnumerable, List, Task, IAnswerOptionService (+3 more)

### Community 98 - "Community 98"
Cohesion: 0.15
Nodes (18): extractErrorMessage(), handleQuestionFetchError(), isActiveSessionError(), useQuizSession(), UseQuizSessionParams, apiService, createQuizSession(), CreateQuizSessionInput (+10 more)

### Community 99 - "Community 99"
Cohesion: 0.12
Nodes (17): DashboardLayout(), DashboardLayoutProps, AppRootProps, activePillTransition, DashboardNav(), DashboardNavProps, labelTransition, NavGroup (+9 more)

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (4): dashboardEndpoints, DashboardFetcherConfig, DashboardResource, RoleAwareEndpointMap

### Community 101 - "Community 101"
Cohesion: 0.18
Nodes (12): ActionResult, CancellationToken, Guid, HttpDelete, HttpGet, HttpPost, IActionResult, IFormFile (+4 more)

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (9): EnableRateLimiting, Guid, HttpGet, HttpPost, IActionResult, ProducesResponseType, string, Task (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.07
Nodes (26): MultiplayerQuestionViewProps, MultiplayerGame(), MultiplayerGameProps, Countdown, Match, mcQuestion, participants, QuestionAnswered (+18 more)

### Community 104 - "Community 104"
Cohesion: 0.12
Nodes (16): aliases, components, utils, iconLibrary, registries, @react-bits, rsc, $schema (+8 more)

### Community 105 - "Community 105"
Cohesion: 0.11
Nodes (19): 1. The stack, 2. What exists today, 3. How to run, 4. Conventions & patterns, 5. Adding a new test — step by step, 6. CI & the deploy gate, 7. Setup notes & known gaps, A. Backend pure logic (xUnit) (+11 more)

### Community 106 - "Community 106"
Cohesion: 0.10
Nodes (22): ActionResult, Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult (+14 more)

### Community 107 - "Community 107"
Cohesion: 0.09
Nodes (33): DataTransferControls(), DataTransferControlsProps, exportData(), ExportFormat, EXTENSION, importData(), ImportResult, TransferEntity (+25 more)

### Community 108 - "Community 108"
Cohesion: 0.13
Nodes (5): How to execute into each database (postgres or mongodb) to verify the existance of data, MONGODB via CMD, MONGODB via Docker, POSTGRES via CMD, POSTGRES via Docker

### Community 109 - "Community 109"
Cohesion: 0.21
Nodes (8): IOrderedQueryable, IQueryable, string, QuizVarietyOrdering, Fact, InlineData, Theory, QuizVarietyOrderingTests

### Community 110 - "Community 110"
Cohesion: 0.26
Nodes (11): UseQuizSessionReturn, QuestionReviewProps, QuizOverview(), QuizOverviewProps, QuizResultsProps, calculateQuizStats(), formatDuration(), getPerformanceLevel() (+3 more)

### Community 111 - "Community 111"
Cohesion: 0.08
Nodes (24): 10. Local code prep — committed + pushed ✅, 11. CI build fix — MongoDB fully removed from DI ✅, 12. Cloudflare Origin certificate created + saved ✅, 13. `api.oxygenquiz.com` brought online (Nginx + Origin cert + Full strict) ✅, 14. Frontend live on `oxygenquiz.com` + admin login working ✅, 1. Code: dropped MongoDB (committed + pushed), 2. Server baseline hardening, 3. SSH key setup (desktop) (+16 more)

### Community 112 - "Community 112"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 113 - "Community 113"
Cohesion: 0.23
Nodes (9): CancellationToken, Guid, IFormFile, IReadOnlyList, Task, IFileService, DateTime, Guid (+1 more)

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (6): ICollection, QuizCM, QuizUM, QuizQuestionCM, Expression, QuizMappers

### Community 115 - "Community 115"
Cohesion: 0.16
Nodes (19): SettingsApplier(), useThemeSetting(), applyFont(), FONT_OPTIONS, FONT_VARS, FontOption, FontZone, normalizeFont() (+11 more)

### Community 116 - "Community 116"
Cohesion: 0.22
Nodes (6): QuizAPI.Services.DataTransfer, IEnumerable, JsonSerializerOptions, DataExportService, ExportFile, IDataExportService

### Community 117 - "Community 117"
Cohesion: 0.14
Nodes (8): QuizAPI.Migrations, ModelSnapshot, ModelBuilder, AddUserSettings, ModelBuilder, FixUserRoleRelationship, ModelBuilder, ApplicationDbContextModelSnapshot

### Community 118 - "Community 118"
Cohesion: 0.24
Nodes (8): DateTime, Guid, FileRecord, CancellationToken, Guid, IReadOnlyList, Task, FileRepository

### Community 119 - "Community 119"
Cohesion: 0.13
Nodes (12): DateTime, expiresAt, IConfiguration, int, IReadOnlyCollection, rawToken, string, tokenHash (+4 more)

### Community 120 - "Community 120"
Cohesion: 0.11
Nodes (19): 10. Common gotchas / troubleshooting, 11. Cheat sheet, 1. The 60-second mental model, 2. What is Cloudflare, and what are Workers?, 3. What is Wrangler?, 4. The files that control all this, 5. How to deploy — the actual steps, 6. Why running it on *your* machine updates the *live* app (+11 more)

### Community 121 - "Community 121"
Cohesion: 0.20
Nodes (9): 1. The 60-second mental model, 2. What each file does, 3. The submit path, step by step, 4. Why there is ONE submit button now (and why there used to be three), 5. Known rough edges (good first cleanups), If you add a new question type, Multiplayer reuses the leaves, Quiz-Playing Architecture (how a quiz is rendered and answered) (+1 more)

### Community 122 - "Community 122"
Cohesion: 0.21
Nodes (11): getGradingStatus(), getQuizSession(), getSessionResults(), useGetGradingStatus(), UseGetGradingStatusOptions, useGetQuizSession(), UseGetQuizSessionOptions, useGetSessionResults() (+3 more)

### Community 123 - "Community 123"
Cohesion: 0.22
Nodes (11): PanelProps, AppearanceSection(), AppearanceSectionProps, AudioSection(), AudioSectionProps, Row(), RowProps, Section() (+3 more)

### Community 124 - "Community 124"
Cohesion: 0.22
Nodes (10): CancellationToken, Guid, HashSet, IFormFile, IHttpContextAccessor, ILogger, long, string (+2 more)

### Community 125 - "Community 125"
Cohesion: 0.33
Nodes (5): JsonSerializerOptions, List, Stream, Type, DataImportService

### Community 126 - "Community 126"
Cohesion: 0.21
Nodes (10): CanvasStrokeStyle, GridOffset, Squares(), SquaresProps, Prism(), PrismProps, useTheme(), EffectType (+2 more)

### Community 127 - "Community 127"
Cohesion: 0.22
Nodes (8): AllSizes, CustomText, Default, Fast, Muted, Quiz, Slow, Story

### Community 128 - "Community 128"
Cohesion: 0.10
Nodes (22): JoinForm(), LeaveLobbyDialog(), LobbyActions(), LobbyActionsProps, LobbyPanel(), LobbyPanelProps, ParticipantCard(), ParticipantCardProps (+14 more)

### Community 129 - "Community 129"
Cohesion: 0.22
Nodes (6): List, Expression, Func, IReadOnlyList, FilterOperator, FilterRule

### Community 130 - "Community 130"
Cohesion: 0.06
Nodes (49): myQuestionKeys, questionKeys, quizQuestionKeys, MutationConfig, deleteQuestion(), DeleteQuestionApiDTO, useDeleteQuestion(), UseDeleteQuestionOptions (+41 more)

### Community 131 - "Community 131"
Cohesion: 0.11
Nodes (19): A. Quick manual test (browser DevTools), An authenticated request, Authentication, B. Rotation / reuse (DB-level), C. Expiry, D. Logout revocation, E. Automated (suggested), How to test the refresh-token implementation (+11 more)

### Community 132 - "Community 132"
Cohesion: 0.11
Nodes (19): 1. The one constraint that shapes every choice, 2. Recommended topology, 3. Pre-deploy checklist, 4. Domain & DNS, 5. Production hardening summary, 6. Rate limiting & DDoS protection, 7. Serverless / AWS Lambda — is it for an app like this?, 8. Launch-day runbook (in order) (+11 more)

### Community 133 - "Community 133"
Cohesion: 0.26
Nodes (10): BaseModel, chat(), ChatRequest, ChatResponse, ErrorResponse, generate_content(), health_check(), Health check endpoint (+2 more)

### Community 134 - "Community 134"
Cohesion: 0.20
Nodes (6): QuizAPI.DTOs.User, DateTime, Guid, FullUserDTO, Guid, ChatUserProjection

### Community 135 - "Community 135"
Cohesion: 0.18
Nodes (14): Caddy Reverse Proxy (TLS + SPA), Invite-Code Gated Signup, Production Docker Compose Stack, MongoDB Removal (Ephemeral Chat), Dev PostgreSQL Container, Full-Stack Docker Compose, Backend (.NET) Tests Job, CI Deploy Gate (+6 more)

### Community 136 - "Community 136"
Cohesion: 0.30
Nodes (10): DateTime, IReadOnlyList, MatchResult, PlayerRoundResult, QuestionResult, RoundAnswer, RoundOption, RoundQuestion (+2 more)

### Community 137 - "Community 137"
Cohesion: 0.18
Nodes (11): DateTime, Guid, RefreshToken, CancellationToken, Guid, Task, IRefreshTokenRepository, CancellationToken (+3 more)

### Community 138 - "Community 138"
Cohesion: 0.10
Nodes (33): AccordionContent, AccordionItem, AccordionTrigger, Card, CardContent, CardDescription, CardFooter, CardHeader (+25 more)

### Community 139 - "Community 139"
Cohesion: 0.18
Nodes (26): QuestionTabContentProps, BaseQuestionFormCardProps, SmallBaseQuestionCard(), SmallBaseQuestionCardProps, SmallQuestionFooter(), SmallQuestionFooterProps, SmallQuestionHeader(), SmallQuestionHeaderProps (+18 more)

### Community 140 - "Community 140"
Cohesion: 0.15
Nodes (14): getCurrentState(), getCurrentStateQueryOptions(), useCurrentStateData(), UseCurrentStateOptions, submitAnswer(), SubmitAnswerInput, submitAnswerInputSchema, useSubmitAnswer() (+6 more)

### Community 143 - "Community 143"
Cohesion: 0.06
Nodes (30): 1. Quiz Session Flow, 2. Component Hierarchy, 3. Component Specifications, Accessibility, AnswerFeedback, API Integration, Architecture, Components and Interfaces (+22 more)

### Community 144 - "Community 144"
Cohesion: 0.22
Nodes (5): Migration, MigrationBuilder, InitialCreate, MigrationBuilder, ReworkQuizVisibilityToStatus

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (7): CancellationToken, Task, IEmailSender, CancellationToken, ILogger, Task, LoggingEmailSender

### Community 146 - "Community 146"
Cohesion: 0.39
Nodes (7): base64(), makeTone(), renderSegments(), sample(), ToneSegment, toWavDataUri(), Wave

### Community 147 - "Community 147"
Cohesion: 0.18
Nodes (12): DrawerFilled(), Divider(), DividerProps, Header(), HeaderProps, HeaderComponent, HeaderComponentProps, HoverEffect() (+4 more)

### Community 148 - "Community 148"
Cohesion: 0.18
Nodes (10): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, App(), AppProvider() (+2 more)

### Community 149 - "Community 149"
Cohesion: 0.14
Nodes (16): createQuestionCategory(), CreateQuestionCategoryInput, createQuestionCategoryInputSchema, useCreateQuestionCategory(), UseCreateQuestionCategoryOptions, deleteQuestionCategory(), DeleteQuestionCategoryDTO, useDeleteQuestionCategory() (+8 more)

### Community 150 - "Community 150"
Cohesion: 0.33
Nodes (5): CancellationToken, Guid, IReadOnlyList, Task, IFileRepository

### Community 153 - "Community 153"
Cohesion: 0.11
Nodes (18): 10. The frontend — Cloudflare Worker, 11. Secrets & configuration, 12. Request lifecycle — following one API call, 13. Where the real build differs from the original plan, 14. At-a-glance summary, 1. The big picture in one paragraph, 2. The one constraint that shaped everything, 3. The domain — `oxygenquiz.com` (+10 more)

### Community 154 - "Community 154"
Cohesion: 0.13
Nodes (21): DashboardErrorElement(), describeError(), detailsRequested(), MainErrorFallback(), TODO: Send to your error monitoring service (Sentry, LogRocket, etc.), apiError, MinimalError, RuntimeCrash (+13 more)

### Community 155 - "Community 155"
Cohesion: 0.28
Nodes (7): BackgroundService, CancellationToken, ILogger, IServiceProvider, Task, TimeSpan, QuizSessionCleanupService

### Community 156 - "Community 156"
Cohesion: 0.12
Nodes (17): 10. Tests, 11. Operational runbook (for the test), 12. File map, 13. Not implemented (optional, from the plan), 1. How it works at a glance, 2. The feature flag, 3. Data model, 4. Code generation & hashing (+9 more)

### Community 157 - "Community 157"
Cohesion: 0.09
Nodes (16): QuizAPI.Controllers, QuizAPI.Middleware, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices, IExceptionHandler, IServiceCollection, string, QuizSessionOptions, CancellationToken (+8 more)

### Community 158 - "Community 158"
Cohesion: 0.22
Nodes (8): coverlet.collector (6.0.2), Microsoft.EntityFrameworkCore.InMemory (8.0.20), Microsoft.NET.Test.Sdk (17.11.1), Moq (4.20.72), xunit (2.9.2), xunit.runner.visualstudio (2.8.2), net8.0, Microsoft.NET.Sdk

### Community 159 - "Community 159"
Cohesion: 0.22
Nodes (7): Guid, IHttpContextAccessor, CurrentUserService, Guid, ICurrentUserService, Guid, TestCurrentUserService

### Community 160 - "Community 160"
Cohesion: 0.44
Nodes (4): Fact, InlineData, Theory, NotACommonPasswordTests

### Community 161 - "Community 161"
Cohesion: 0.18
Nodes (11): scripts, build, build:dev, build-storybook, chromatic, dev, lint, preview (+3 more)

### Community 162 - "Community 162"
Cohesion: 0.25
Nodes (4): RotatingText, RotatingTextProps, RotatingTextRef, ChooseQuiz()

### Community 163 - "Community 163"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, noUnusedLocals, noUnusedParameters, paths, files, @/*, references

### Community 164 - "Community 164"
Cohesion: 0.11
Nodes (17): Adding filtering to an entity (3 steps), Backend architecture (`QuizAPI.Filtering`), Decision: pagination lives in the body, Design goals, Filtering, Sorting & Pagination, Frontend architecture (`src/lib/filtering`), Frontend: one pager per list, and it's `PaginationControls`, Migration path (remaining) (+9 more)

### Community 167 - "Community 167"
Cohesion: 0.36
Nodes (8): Exception, AppException, AppValidationException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException, SessionJoinException

### Community 168 - "Community 168"
Cohesion: 0.08
Nodes (23): A1. New entity `RefreshToken`, A2. DbContext + migration, A3. Repository, A4. Token service changes, A5. AuthenticationService changes, A6. Controller endpoints, B1. New entity `FileRecord`, B2. DbContext + migration (+15 more)

### Community 169 - "Community 169"
Cohesion: 0.46
Nodes (6): decode(), encode(), hash(), omit(), requireAdmin(), sanitizeUser()

### Community 170 - "Community 170"
Cohesion: 0.12
Nodes (15): 1. The big picture, 2. Data model, 3. The storage pipeline (`FileService`), 4. Request flow, 5. Files changed (backend), 6. Database migration, 7. Frontend, 8. How to extend (+7 more)

### Community 171 - "Community 171"
Cohesion: 0.13
Nodes (23): DrawerLinks(), DrawerNavLink(), DrawerNavLinkProps, iconClasses(), labelClasses(), rowClasses(), AccountOverlay(), SectionButton() (+15 more)

### Community 172 - "Community 172"
Cohesion: 0.07
Nodes (29): Badge(), BadgeProps, badgeVariants, Checkbox, TrueFalseQuestionCardProps, TrueFalseQuestionListProps, UpdateTrueFalseQuestionFormProps, TypeTheAnswerQuestionListProps (+21 more)

### Community 174 - "Community 174"
Cohesion: 0.29
Nodes (6): Adding a new question type, Question-type color schema, Single source of truth, States, precisely, The palette, Why it's built this way

### Community 176 - "Community 176"
Cohesion: 0.29
Nodes (6): eslintConfig, extends, name, private, type, version

### Community 177 - "Community 177"
Cohesion: 0.38
Nodes (5): CancellationToken, IEnumerable, IReadOnlyList, Task, IRoleRepository

### Community 178 - "Community 178"
Cohesion: 0.29
Nodes (6): base, FewPages, FirstPage, LastPage, MiddlePage, Story

### Community 179 - "Community 179"
Cohesion: 0.13
Nodes (15): Data model, Email sending, Email verification — design, Endpoints (extend `Controllers/Authentication/Authentication.cs`), Files to touch, Frontend changes, Goal & non-goals, Open decisions (+7 more)

### Community 183 - "Community 183"
Cohesion: 0.33
Nodes (6): Abstract blue and purple fluid-gradient wallpaper used as a light-theme app background, Photograph of Earth seen from orbit with a docked spacecraft module, used as an app background, Photograph of a large Moreton Bay fig tree with sprawling roots backlit by a sunburst, used as an app background, Abstract dark navy and purple fluid-gradient wallpaper used as a dark-theme app background, Stylized grayscale vector illustration of a large tree with exposed roots against a gradient sky, decorative scenery graphic, Unsplash photograph of the Very Large Telescope observatory buildings at dusk, used as a scenic app background

### Community 184 - "Community 184"
Cohesion: 0.33
Nodes (6): Portrait of the quiz-show host, a smiling man in a dark suit and tartan tie, cut out on a black background, Portrait of the same quiz-show host in a dark suit and plaid tie, cut out on a white background, Cartoon illustration of the quiz-show host in a suit standing before a game-show set with contestant podiums, a question-mark screen and an audience, History category thumbnail: photo of the Oxygen TV quiz studio with four numbered contestant podiums and the host at center, Photograph of the Oxygen TV quiz studio set with numbered podiums, circular OXYGEN floor logo and stage lighting, Aerial photograph of the Oxygen TV studio showing the host interviewing a guest in the center circle with a live audience and band

### Community 185 - "Community 185"
Cohesion: 0.22
Nodes (8): 1. Authorization rules, 2. API, 3. Backend implementation, 4. Frontend, 5. Tests, 6. File map, 7. Known limitations / follow-ups, Changing a User's Role

### Community 186 - "Community 186"
Cohesion: 0.11
Nodes (18): 1. Co-locate the file, 2. Use the CSF3 format with full typing, 3. Story the presentational component, not the data-fetching wrapper, 4. Mock complex props with a typed factory, 5. Use `render` only when a story needs more than static args, 6. Theme & providers, Better than a mock: run the real pure function, Canonical examples in this repo (+10 more)

### Community 187 - "Community 187"
Cohesion: 0.50
Nodes (3): ExpressionVisitor, ParameterReplacer, ParameterExpression

### Community 190 - "Community 190"
Cohesion: 0.40
Nodes (4): CancellationToken, Func, IQueryable, Task

### Community 191 - "Community 191"
Cohesion: 0.70
Nodes (3): List, AiImportQuestionCM, AiQuizImportCM

### Community 192 - "Community 192"
Cohesion: 0.40
Nodes (3): int, string, TrueFalseOption

### Community 193 - "Community 193"
Cohesion: 0.16
Nodes (16): CancellationToken, Guid, Task, IUserStatsService, CancellationToken, Guid, ILogger, Task (+8 more)

### Community 194 - "Community 194"
Cohesion: 0.11
Nodes (21): ConnectionStatus, useConnectionStatus(), useMultiplayer(), CreateLobbyDialog(), CreateLobbyDialogProps, generateRoomCode(), CreateLobbyDialogView(), Creating (+13 more)

### Community 195 - "Community 195"
Cohesion: 0.14
Nodes (13): AuthResponseDTO, DateTime, AuthResult, ExternalLoginDTO, ExternalLoginOutcome, ExternalSignupDTO, ExternalSignupRequiredDTO, LoginDTO (+5 more)

### Community 196 - "known-issues.md"
Cohesion: 0.16
Nodes (4): Lifecycle, Open, Proposals, Why these are separate

### Community 197 - "IQuestionRepository"
Cohesion: 0.18
Nodes (9): ErrorMessage, IsCustomMessage, Success, CancellationToken, Category, Guid, Language, Task (+1 more)

### Community 198 - "Community 198"
Cohesion: 0.29
Nodes (7): llmApi, llmChat(), LlmChatInput, llmChatInputSchema, LlmChatResponse, useLlmChat(), UseLlmChatOptions

### Community 199 - "Multiplayer"
Cohesion: 0.08
Nodes (26): 1. Architecture, 2. State ownership, 3.1 A lobby outlives a match, 3.2 The rematch reset, 3.3 "Already started" means a live loop, not a phase, 3.4 Server-side vs client-side return to lobby, 3.5 Leaving and disconnecting, 3. Session lifecycle (+18 more)

### Community 200 - "LobbyPageView.stories.tsx"
Cohesion: 0.08
Nodes (24): allReady, chemistryQuiz, conversation, GuestReadyWaitingForHost, guestRoster, GuestWaitingForHostToPickQuiz, HostAloneNoQuiz, HostCanStart (+16 more)

### Community 201 - "ExternalAuthenticationTests"
Cohesion: 0.29
Nodes (4): Fact, Mock, Task, ExternalAuthenticationTests

### Community 202 - ".Generate"
Cohesion: 0.17
Nodes (14): ActionResult, CancellationToken, HttpGet, HttpPost, IActionResult, IReadOnlyList, Task, InviteCodesController (+6 more)

### Community 203 - "Community 203"
Cohesion: 0.09
Nodes (17): CancellationToken, ConfigurationManager, IConfiguration, string, Task, GoogleIdentityVerifier, CancellationToken, Task (+9 more)

### Community 205 - "Community 205"
Cohesion: 0.40
Nodes (4): resourceId, type, dependencies, apis1

### Community 206 - "Community 206"
Cohesion: 0.15
Nodes (12): Architecture, AWS TLS Management, Backend (`OxygenBackend/QuizAPI/appsettings.*.json`), Deployment (AWS), FastAPI Microservice (`microservice/.env`), Frontend (`.env.development`, `.env.production`), Local Development Commands, OxygenQuiz (+4 more)

### Community 207 - "AnswerGradingServiceTests"
Cohesion: 0.34
Nodes (6): Fact, InlineData, List, Task, Theory, AnswerGradingServiceTests

### Community 209 - "Community 209"
Cohesion: 0.38
Nodes (7): Fact, Guid, int, IReadOnlyList, Mock, Task, UserServiceRoleTests

### Community 210 - "Community 210"
Cohesion: 0.20
Nodes (10): AI quiz creation (2026-07-17 — see docs/quiz/ai-quiz-architecture.md), Auth enhancements, Code quality / cleanup, Known Issues & Deferred Improvements, Multiplayer / Game State, Operations / deployment, Quiz editing (2026-07-02 — see docs/quiz/quiz-editing.md), Repo hygiene (+2 more)

### Community 211 - "type-the-asnwer-question-form.tsx"
Cohesion: 0.27
Nodes (11): getErrorAwareStyles(), ImageHandlerProps, useFormValidation(), ValidationError, ValidationErrorsDisplay(), ValidationErrorsDisplayProps, BaseQuestionFormCard(), NewQuestionCard() (+3 more)

### Community 212 - ".EffectiveElapsed"
Cohesion: 0.22
Nodes (7): TimeSpan, QuizTiming, Fact, InlineData, Theory, TimeSpan, QuizTimingTests

### Community 213 - "ExternalLogin"
Cohesion: 0.22
Nodes (9): DateTime, Guid, ExternalLogin, CancellationToken, Task, ExternalLoginRepository, CancellationToken, Task (+1 more)

### Community 214 - "InviteCode"
Cohesion: 0.23
Nodes (9): DateTime, Guid, InviteCode, CancellationToken, Guid, IEnumerable, IReadOnlyList, Task (+1 more)

### Community 215 - "get-public-quizzes.ts"
Cohesion: 0.22
Nodes (11): handleLoaderError(), quizLoader(), quizSelectionLoader(), getPublicQuizzes(), GetPublicQuizzesParams, getPublicQuizzesQueryOptions(), usePublicQuizzesData(), UsePublicQuizzesOptions (+3 more)

### Community 216 - "Implementation Plan — Google & Microsoft Sign-In (External Identity Providers)"
Cohesion: 0.13
Nodes (15): 10. Explicitly out of scope (future work), 11. File map (planned), 1. The approach: backend ID-token verification (and why), 2. Design decisions (and why), 3. Data model, 4. Provider verification layer, 5.1 `POST /api/Authentication/external-login` — `[AllowAnonymous]`, `AuthPolicy`, 5.2 `POST /api/Authentication/external-signup` — `[AllowAnonymous]`, `AuthPolicy` (+7 more)

### Community 217 - "QuizAPI.Services.Scoring"
Cohesion: 0.15
Nodes (6): QuizAPI.Controllers.Questions.TestQuestions.Services, QuizAPI.Services.Grading, QuizAPI.Tests.Grading, QuizAPI.Controllers.Questions.TestQuestions, QuizAPI.Tests.Scoring, QuizAPI.Services.Scoring

### Community 218 - "Responsive & Mobile Conventions"
Cohesion: 0.14
Nodes (14): Backgrounded tabs & timers (mobile), Checklist for new pages/components, Filling the screen: `flex-1`, not `h-screen`, Layout patterns, Lists whose length is data, not design, Responsive & Mobile Conventions, Rows of buttons: reflow them, don't let flex squeeze them, Safe areas (notches, home indicators) (+6 more)

### Community 219 - "Google & Microsoft Sign-In (External Identity Providers)"
Cohesion: 0.15
Nodes (13): 1. How it works at a glance, 2. Data model, 3. Token verification, 4. Endpoints, 5. Frontend — the invite-first signup flow, 6. Configuration & provider setup, 7. Tests, 8. Going live — remaining steps (+5 more)

### Community 220 - "Graphify knowledge graph"
Cohesion: 0.15
Nodes (12): 1. TL;DR — when to reach for it, 2. What actually got built, 3. Everyday use, 4. What it's genuinely good at, 5. Where it falls short (be realistic), 6. How this project is wired to use it, 7. Rebuilding from scratch, Ask it a question (the part worth using) (+4 more)

### Community 221 - "Community 221"
Cohesion: 0.35
Nodes (11): AppNotification, invalidateAll(), notificationKeys, notificationsQueryOptions(), useDeleteNotification(), useMarkAllNotificationsRead(), useMarkNotificationRead(), useMyNotifications() (+3 more)

### Community 222 - "create-question-difficulty.ts"
Cohesion: 0.21
Nodes (11): createQuestionDifficulty(), CreateQuestionDifficultyInput, createQuestionDifficultyInputSchema, useCreateQuestionDifficulty(), UseCreateQuestionDifficultyOptions, deleteQuestionDifficulty(), DeleteQuestionDifficultyDTO, useDeleteQuestionDifficulty() (+3 more)

### Community 223 - "floating-avatar-cluster.tsx"
Cohesion: 0.19
Nodes (11): AvatarCircle(), AvatarClusterPlayer, AvatarState, BADGE_BG, FloatingAvatarCluster(), FloatingAvatarClusterProps, GLOW, RING (+3 more)

### Community 224 - "Community 224"
Cohesion: 0.50
Nodes (3): type, dependencies, apis1

### Community 227 - "Community 227"
Cohesion: 0.20
Nodes (10): Authorization summary, Discovery (lists, search, catalogue), Guests, How access is enforced, Implementation status, Import / export, Quiz visibility & sharing, The three states (+2 more)

### Community 229 - "Community 229"
Cohesion: 0.15
Nodes (13): (A) Gate the multiplayer routes — frontend, (B) Use the account username — frontend, (C) Enforce identity on the hub — backend (the actual security), Current state, Design — three layers, Edge cases & decisions, Files to touch, Identity is client-supplied, not the account (+5 more)

### Community 230 - "Community 230"
Cohesion: 0.15
Nodes (12): Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Introduction, Note, Requirement 1: Quiz Interaction, Requirement 2: Progress Tracking (+4 more)

### Community 231 - "ApplicationDbContext"
Cohesion: 0.18
Nodes (11): DbContext, DbSet, ApplicationDbContext, RolePermission, DateTime, Guid, UserRole, ICollection (+3 more)

### Community 232 - "Community 232"
Cohesion: 0.67
Nodes (3): Lone tree silhouetted beneath the Milky Way in a starry night sky between hills, Large radio telescope satellite dish under a starry night sky with a meteor streak, The planet Saturn with its rings and the moon Titan, photographed from space

### Community 233 - "Community 233"
Cohesion: 0.67
Nodes (3): vite, O2 logo: 3D magnifying-glass forming the chemical symbol O2 with a superscript square, the OxygenQuiz app brand mark in teal, Vite logo: lightning-bolt mark in blue-to-purple and yellow gradient, the frontend build tool's default favicon

### Community 242 - "Community 242"
Cohesion: 0.29
Nodes (3): TimeSpan, Fact, QuizScoringTests

### Community 269 - "TopNotification.stories.tsx"
Cohesion: 0.17
Nodes (11): Deploy order, Error details: hidden from users, reachable on demand, Error Handling, Key files, Sizing, The bug that motivated this (worth understanding — it will recur), The default: queries throw — except on 401, The floor: one root `errorElement` (+3 more)

### Community 270 - "Proposal: partial credit for multi-select questions"
Cohesion: 0.17
Nodes (12): 1. What happens today, 2. The case for and against, 3.1 Proportional, 3.2 Proportional with penalty, 3.3 Threshold, 3.4 All-or-nothing (status quo), 3. Schemes, 4. What each costs (+4 more)

### Community 271 - "Guest play — one free singleplayer quiz, no account required"
Cohesion: 0.17
Nodes (12): Architecture, Backend, Frontend, Guest play — one free singleplayer quiz, no account required, Lifecycle of a guest session, Product rule, Related, Routing (+4 more)

### Community 272 - "Configuration & Settings — how OxygenQuiz reads its config"
Cohesion: 0.17
Nodes (12): 1. `appsettings.json` — the base, 1. The one-sentence mental model, 2. `appsettings.{Environment}.json` — the per-environment overlay, 2. The layers, one at a time, 3. The `__` (double-underscore) nesting convention, 3. User-secrets — development only, 4. Environment variables — the top layer (this is what production actually uses), 4. Where each production value actually comes from (+4 more)

### Community 273 - "VPS Launch Checklist (Hetzner backend + Cloudflare Pages frontend)"
Cohesion: 0.17
Nodes (12): 0. The MongoDB decision (do this first — it changes your compose file), 10. Right after launch, 1. DNS — point the domain at Cloudflare and the server, 2. Server baseline hardening, 3. Install Docker, 4. Provision data + TLS, 5. Reverse proxy (Nginx) in front of the backend, 6. Production compose (no Mongo) (+4 more)

### Community 274 - "Quiz editing & version pinning"
Cohesion: 0.18
Nodes (11): Data model, Frontend, Growth & cleanup, Migration (run on your machine — not yet generated), Quiz editing & version pinning, Session pinning (editor-vs-player), Tests, The design in one paragraph (+3 more)

### Community 275 - "IImageService"
Cohesion: 0.17
Nodes (12): 1. What the manual flow does today, 2.1 It isn't atomic, and the code knows it, 2.2 Partial failure inside step 2 is unhandled, 2.3 Request count scales with quiz size, 2.4 Ordering is implicit, 2. What's wrong with it, 3. The flow you already built, 4. Proposal (+4 more)

### Community 276 - "InviteCodeRepository"
Cohesion: 0.33
Nodes (5): Backend extras, Backend (VPS, Docker), Deploy Cheat Sheet, Frontend (Cloudflare Workers — desktop only, no VPS), Quick reference

### Community 277 - "Implementation Plan — Invite-Code Signup Gate"
Cohesion: 0.18
Nodes (11): 10. Operational runbook, 1. Design decisions (and why), 2. Data model, 3. Repository, 4. Signup flow, 5. Code generation, 6. Disable guest play during the test (optional), 7. Frontend (+3 more)

### Community 278 - "Production Runbook — oxygenquiz.com on Hetzner"
Cohesion: 0.30
Nodes (8): IHostEnvironment, CancellationToken, Guid, IConfiguration, ILogger, int, Task, DbSeeder

### Community 279 - "Image Upload Flow (ImageAsset pipeline)"
Cohesion: 0.17
Nodes (11): 1. Upload — `POST /api/ImageUpload/question`, 2. Associate — `POST /api/ImageUpload/associate`, Cleanup job, Components, Endpoints, Image Upload Flow (ImageAsset pipeline), `ImageAsset` schema, Lifecycle (sequence) (+3 more)

### Community 280 - "Quiz Answer Submission & Grading"
Cohesion: 0.14
Nodes (14): Grading rules (`AnswerGradingService.DetermineCorrectnessAsync`), Instant feedback result (`InstantFeedbackAnswerResultDto`), Key files, Latency-compensated timing, Multiplayer, Quiz Answer Submission & Grading, Scoring, Submission flow (`SubmitAnswerAsync`) (+6 more)

### Community 281 - "IInviteCodeGenerator"
Cohesion: 0.18
Nodes (4): IInviteCodeGenerator, int, string, InviteCodeGenerator

### Community 282 - "lobby-chat-view.tsx"
Cohesion: 0.26
Nodes (8): ScrollArea, ScrollBar, LobbyChat(), LobbyChatProps, LobbyChatView(), LobbyChatViewProps, UseChatUnreadOptions, LobbyChatMessage

### Community 283 - "QuizHistoryList.tsx"
Cohesion: 0.29
Nodes (9): getUserSessions(), getUserSessionsQueryOptions(), useUserSessions(), MyQuizHistory(), formatDuration(), HistoryRow(), QuizHistoryList(), statusBadge() (+1 more)

### Community 284 - "Generic File Storage (Files entity)"
Cohesion: 0.20
Nodes (9): Avatar change (implemented), Can both systems coexist? Yes., Endpoints (`Controllers/Files/FilesController.cs`, `[Authorize]`), `FileRecord` schema (table `Files`), Future convergence (not now), Generic File Storage (Files entity), Purpose, Required vs optional (+1 more)

### Community 285 - "Getting Started — Required Software & Setup"
Cohesion: 0.20
Nodes (10): 1. Database, 2. Backend API, 3. Frontend, First login, Getting Started — Required Software & Setup, Option A — Docker Compose (quickest), Option B — Run locally (without Docker), Optional — AI / LLM chat microservice (+2 more)

### Community 286 - "ReportsController.cs"
Cohesion: 0.20
Nodes (6): QuizAPI.Services.Reports, QuizAPI.DTOs.Reports, QuizAPI.Controllers.Reports, List, Stream, IDataImportService

### Community 287 - "Deployment Runbook — quick commands"
Cohesion: 0.18
Nodes (11): 1. Connect to the server, 2. Check the current state of things, 3. Everyday operations, 4. Deploying a code change, 4a. Backend change (desktop → GitHub → server), 4b. Frontend change (desktop → Cloudflare, no server), 5. DONE — Data Protection fix + DNS + CI fix + Origin cert (2026-07-03 → 07-04), 6. ✅ DONE (2026-07-04) — bring `api.oxygenquiz.com` online (Nginx + Origin cert) (+3 more)

### Community 288 - "Audit Logging"
Cohesion: 0.22
Nodes (8): Adding a new audited action, Audit Logging, How to read it, How to write one, Purpose, What a row records, What NOT to audit, Where it's used today

### Community 289 - "Rate Limiting"
Cohesion: 0.22
Nodes (9): Endpoint policies, Rate Limiting, Rejection behavior, Related, Testing it, Trusting the client IP, Tuning, What's configured (+1 more)

### Community 290 - "Production Runbook — oxygenquiz.com on Hetzner"
Cohesion: 0.18
Nodes (11): Notes, Production Runbook — oxygenquiz.com on Hetzner, Step 0 — One required code change (forwarded headers), Step 1 — Cloudflare (DNS + TLS), Step 2 — Server prep (Docker + firewall), Step 3 — Copy config + secrets onto the server, Step 4 — Build the frontend and copy it up, Step 5 — Bring it up (+3 more)

### Community 291 - "StatsPanel.tsx"
Cohesion: 0.29
Nodes (7): number(), StatsContent(), StatsPanel(), getUserQuizStats(), getUserQuizStatsQueryOptions(), useUserQuizStats(), UserQuizStats

### Community 292 - "OxygenQuiz — Session Handoff"
Cohesion: 0.29
Nodes (6): Conventions we settled on, OPEN LOOSE ENDS (do these / keep in mind), OxygenQuiz — Session Handoff, Possible next steps we discussed, Project, What was built this session

### Community 293 - "Account & Settings Overlay"
Cohesion: 0.20
Nodes (10): Account & Settings Overlay, How it opens: a query param, not a path, Key files, Responsive behaviour, Sections, Settings state, Stats vs. history, What this replaced (+2 more)

### Community 294 - "upload-file.ts"
Cohesion: 0.09
Nodes (23): RFC-7807, FileRecord, uploadFile(), UploadFileInput, useUploadFile(), api, CUSTOM_ERROR_PATTERNS, isCustomErrorMessage() (+15 more)

### Community 295 - "enter-databases.md"
Cohesion: 0.20
Nodes (10): 1. The case for, 2. Algorithm, 3. Threshold, 4. Interaction with existing settings, 5. Rollout, 6. Risks, 7. Sketch, Proposal: typo tolerance for typed answers (+2 more)

### Community 296 - "MongoDB — disabled (and how to bring it back)"
Cohesion: 0.33
Nodes (6): How to re-add MongoDB (when the persistent chat system lands), MongoDB — disabled (and how to bring it back), Related, What changed, What was deliberately **kept** (dormant, for the future chat system), Why it was removed

### Community 297 - "Reference data (importable)"
Cohesion: 0.33
Nodes (5): About the category colour (the quiz-select UX), Field reference, Files, How to import, Reference data (importable)

### Community 298 - "get-individual-question.ts"
Cohesion: 0.12
Nodes (16): ApiFnReturnType, QueryConfig, getIndividualQuestion(), getIndividualQuestionQueryOptions(), useIndividualQuestionData(), UseIndividualQuestionOptions, getTotalUsers(), getTotalUsersQueryOptions() (+8 more)

### Community 300 - "Typed-answer matching"
Cohesion: 0.20
Nodes (10): 1. Normalisation — always on, 2. Exact match, 3. Partial match — per-question toggle, Related, The known limits of partial match, The two things an author is choosing between, Typed-answer matching, What changed (2026-07-31) (+2 more)

### Community 301 - "QuestionDifficultyDTO"
Cohesion: 0.20
Nodes (10): Computed on read, not denormalised, Endpoints, Frontend, Key files, Quiz History & Player Stats, The history list query (and the N+1 it replaced), The index, `UserQuizStatsDto` (+2 more)

### Community 302 - "Claude Code plugins"
Cohesion: 0.22
Nodes (8): Claude Code plugins, claude-mem, context-mode, frontend-design, How triggering works, skill-creator, superpowers, Using this on another device

### Community 431 - "Derived State Pattern"
Cohesion: 0.31
Nodes (5): ILogger, IWebHostEnvironment, Stream, Task, ImageService

### Community 432 - "Multiplayer Feature"
Cohesion: 0.42
Nodes (6): EmailVerificationBanner(), resendVerification(), useResendVerification(), verifyEmail(), ConfirmEmail(), User

### Community 433 - "MultiplayerContext"
Cohesion: 0.22
Nodes (8): Checking, Empty, Filled, LobbyFull, NoInternet, RoomNotFound, ServerUnavailable, Story

### Community 434 - "MultiplayerLobby Component"
Cohesion: 0.32
Nodes (4): QuizAPI.DTOs.Files, QuizAPI.Controllers.Files.Services, QuizAPI.Controllers.Files, QuizAPI.Controllers.Users.Services

### Community 435 - "IQuizClient"
Cohesion: 0.29
Nodes (7): QuizAPI.DTOs.Invitations, DateTime, Guid, List, GeneratedInviteCodesDTO, GenerateInviteCodesDTO, InviteCodeStatusDTO

### Community 436 - "QuizHub (SignalR Hub)"
Cohesion: 0.25
Nodes (8): Clock skew (same day), If you touch this, Related, Tests, The model, The question timer, The two rules that keep it working, What went wrong (2026-08-02)

### Community 437 - "InMemoryQuizSessionManager"
Cohesion: 0.29
Nodes (6): double, PointSystem, int, QuizScoring, InlineData, Theory

### Community 512 - "create-quiz-method-dialog.stories.tsx"
Cohesion: 0.25
Nodes (7): CreateQuizMethodDialog(), ClosedWithTrigger, Open, OpenForUserDashboard, OpenOnMobile, OpenWithoutNewBadge, Story

### Community 513 - "quiz-timer.tsx"
Cohesion: 0.29
Nodes (4): QuizTimer(), QuizTimerProps, SIZE_CONFIG, TimerSize

### Community 514 - "Dynamic Reports"
Cohesion: 0.29
Nodes (7): API (`api/reports`, `[Authorize]`, scoped to the current user), Criteria, Dynamic Reports, Extending, Files, On-screen filters (and export parity), Reports

### Community 515 - "NotACommonPasswordAttribute"
Cohesion: 0.29
Nodes (5): HashSet, NotACommonPasswordAttribute, ValidationAttribute, ValidationContext, ValidationResult

### Community 516 - "mode-card.tsx"
Cohesion: 0.33
Nodes (4): CARD_ACCENTS, CardAccent, ModeCard(), ModeCardProps

### Community 517 - "Import templates"
Cohesion: 0.40
Nodes (4): Import templates, Notes, Questions, Quizzes

### Community 518 - "Favicon"
Cohesion: 0.40
Nodes (4): Favicon, How the switch works, Regenerating `public/favicon.svg`, Scope / not included

### Community 519 - "Quiz question classification"
Cohesion: 0.40
Nodes (5): Hiding the "Unspecified" lookup, No question may be stored as Unspecified, Quiz question classification, The rule, Where it happens

### Community 533 - "generate-favicon.py"
Cohesion: 0.70
Nodes (4): build_svg(), fetch_font(), main(), TTFont

### Community 549 - "msal.ts"
Cohesion: 0.67
Nodes (3): acquireMicrosoftIdToken(), getMsalInstance(), LOGIN_SCOPES

## Knowledge Gaps
- **1662 isolated node(s):** `config`, `preview`, `QuizAPI.Tests.Discovery`, `QuizAPI.Tests.Editing`, `net8.0` (+1657 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **263 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApplicationDbContext` connect `ApplicationDbContext` to `REST Controller Base`, `Community 137`, `Invite Codes API`, `Answer Grading Service`, `Quiz Session Service`, `Production Runbook — oxygenquiz.com on Hetzner`, `Question Models`, `Community 30`, `Community 159`, `Community 32`, `Community 43`, `Community 44`, `Derived State Pattern`, `Community 51`, `Community 54`, `Community 59`, `Community 62`, `Community 193`, `Community 67`, `ExternalAuthenticationTests`, `.Generate`, `Community 74`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `AnswerGradingServiceTests`, `Community 209`, `ExternalLogin`, `Community 86`, `InviteCode`, `Community 87`, `Community 89`, `Community 95`, `Community 97`, `Community 106`, `Community 118`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `QuizAPI.Data` connect `Audit & Repositories` to `Backend Namespaces / Tests`, `20251225173303_InitialCreate.Designer.cs`, `20260606084508_Settings-Files-AuditLogs-RolePermission.Designer.cs`, `20260606131927_AuditLogs_Notifications_RetireUpdatedAt.Designer.cs`, `20260608210338_Fix_RolePermissions_ShadowFK.Designer.cs`, `20260609193513_AddFontSetting.Designer.cs`, `20260612120000_RemoveUniversitetiDrejtimi.Designer.cs`, `20260615120000_AddQuizSoftDelete.Designer.cs`, `20260618203133_AddQuestionAndFileMedia.Designer.cs`, `20260620222311_AddEmailVerification.Designer.cs`, `Backend Service Namespaces`, `20260626191712_ReworkQuizVisibilityToStatus.Designer.cs`, `20260628202215_AddInviteCodes.Designer.cs`, `20260622193358_AddGuestQuizSessions.Designer.cs`, `20260702170817_QuizEditingVersioning.Designer.cs`, `20260726102121_AddExternalLogins.Designer.cs`, `20260728120000_RescaleScoresToHighResolutionBase.Designer.cs`, `ReportsController.cs`, `Community 54`, `Community 61`, `QuizAPI.Services.Scoring`, `Community 91`, `Community 117`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `QuizAPI.Models` connect `Audit & Repositories` to `Community 134`, `REST Controller Base`, `Community 137`, `Backend Namespaces / Tests`, `Question Models`, `Backend Service Namespaces`, `Community 35`, `Community 43`, `MultiplayerLobby Component`, `Community 51`, `Community 54`, `Community 61`, `Community 62`, `Community 192`, `Community 76`, `Community 80`, `Community 82`, `ExternalLogin`, `InviteCode`, `Community 89`, `QuizAPI.Services.Scoring`, `Community 91`, `Community 97`, `ApplicationDbContext`, `Community 118`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `config`, `preview`, `QuizAPI.Tests.Discovery` to the rest of the system?**
  _1713 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Card & Text Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Form & Select UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.07226890756302522 - nodes in this community are weakly interconnected._
- **Should `Background & Drawer UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07207920792079207 - nodes in this community are weakly interconnected._