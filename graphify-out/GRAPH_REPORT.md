# Graph Report - OxygenQuiz  (2026-07-23)

## Corpus Check
- 913 files · ~1,523,040 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5513 nodes · 13096 edges · 482 communities (238 shown, 244 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 495 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a2c73c5`
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
- Community 151
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
- Community 198
- Community 203
- Community 204
- Community 205
- Community 206
- Community 208
- Community 209
- Community 210
- Community 221
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
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
- Generic File Storage (Files entity)
- Getting Started — Required Software & Setup
- Deployment Runbook — quick commands
- Audit Logging
- Rate Limiting
- OxygenQuiz — Session Handoff
- upload-file.ts
- enter-databases.md
- MongoDB — disabled (and how to bring it back)
- Reference data (importable)
- get-individual-question.ts
- QuizEditingVersioning
- QuestionDifficultyDTO
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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 116 edges
2. `QuizAPI.Models` - 89 edges
3. `Button` - 83 edges
4. `ApplicationDbContext` - 74 edges
5. `useNotifications` - 68 edges
6. `QuestionType` - 61 edges
7. `QuizAPI.Data` - 54 edges
8. `Result` - 48 edges
9. `Card` - 46 edges
10. `api` - 46 edges

## Surprising Connections (you probably didn't know these)
- `Storybook Google Fonts Preload` --semantically_similar_to--> `Google Fonts (App)`  [INFERRED] [semantically similar]
  .storybook/preview-head.html → index.html
- `Production Docker Compose Stack` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  deploy/docker-compose.prod.yml → docker-compose.yml
- `Dev PostgreSQL Container` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  docker-compose.dev.yml → docker-compose.yml
- `refreshAccessToken()` --references--> `axios`  [EXTRACTED]
  src/lib/Api-client.ts → package.json
- `ColorCard()` --references--> `react`  [EXTRACTED]
  src/common/ColouredCard.tsx → package.json

## Import Cycles
- None detected.

## Communities (482 total, 244 thin omitted)

### Community 0 - "UI Card & Text Components"
Cohesion: 0.07
Nodes (28): 10. Known follow-ups, 11. Dependency, 1. Overview, 2. Core concepts, 3. File-by-file, 4. Where each sound is triggered, 5. How to use it in new code, 6. Adding a new sound (+20 more)

### Community 1 - "File Upload & LLM API (frontend)"
Cohesion: 0.21
Nodes (11): createQuestionLanguage(), CreateQuestionLanguageInput, createQuestionLanguageInputSchema, useCreateQuestionLanguage(), UseCreateQuestionLanguageOptions, deleteQuestionLanguage(), DeleteQuestionLanguageDTO, useDeleteQuestionLanguage() (+3 more)

### Community 2 - "Form & Select UI Primitives"
Cohesion: 0.04
Nodes (100): react, BackButtonProps, LIFT_COLOR_TOKENS, LiftColorToken, LiftedButton, LiftedButtonProps, useNotifications, Button (+92 more)

### Community 3 - "Background & Drawer UI"
Cohesion: 0.04
Nodes (128): DataTransferControls(), DataTransferControlsProps, DataTable(), ConfirmationDialogProps, DialogContent, DialogDescription, DialogFooter(), DialogHeader() (+120 more)

### Community 4 - "Button & Notification UI"
Cohesion: 0.33
Nodes (6): NotificationRow(), formatDate(), QuizProperties(), QuizPropertiesProps, QuizProperty, Quiz

### Community 5 - "Avatar Service (backend)"
Cohesion: 0.06
Nodes (45): BaseApiController, CancellationToken, Guid, IFormFile, Task, IAvatarService, CancellationToken, Guid (+37 more)

### Community 6 - "REST Controller Base"
Cohesion: 0.06
Nodes (41): ActionResult, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+33 more)

### Community 7 - "DataTable & Sheet UI"
Cohesion: 0.07
Nodes (26): 10a. Per-flow persistence semantics (deliberate divergence), 11. Maintainability & known seams, 12. Making new question types cheap (a path, not a task), 13. Summary of guarantees, 1. What this feature is, in one paragraph, 2. Component map, 3. The data pipeline (happy path), 4. Trust boundaries and defense in depth (+18 more)

### Community 8 - "Pagination & Audit-Log Queries"
Cohesion: 0.07
Nodes (43): PaginationControlsProps, cleanQueryParams(), extractPaginationFromHeaders(), quizSelectionLoader(), AuditLogsResult, getAuditLogs(), GetAuditLogsParams, getAuditLogsQueryOptions() (+35 more)

### Community 9 - "Auth & App Bootstrap (frontend)"
Cohesion: 0.06
Nodes (35): adminAuthLoader(), authConfig, createAuthLoader(), getUser(), LoginInput, loginInputSchema, logout(), permissionAuthLoader() (+27 more)

### Community 10 - "Invite Codes API"
Cohesion: 0.05
Nodes (41): QuizAPI.DTOs.Invitations, ActionResult, CancellationToken, HttpGet, HttpPost, IActionResult, IReadOnlyList, Task (+33 more)

### Community 11 - "Questions API Controller"
Cohesion: 0.13
Nodes (19): Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, Task (+11 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (54): dependencies, axios, class-variance-authority, clsx, date-fns, framer-motion, gsap, @gsap/react (+46 more)

### Community 14 - "Data Import/Export"
Cohesion: 0.20
Nodes (10): howler, AudioPrefsStore, useAudioStore, audio, AudioManager, AudioProvider(), MusicName, N (+2 more)

### Community 15 - "Answer Grading Service"
Cohesion: 0.09
Nodes (25): DateTime, Guid, Task, GradingResult, IAnswerGradingService, Task, ISubmitAnswerService, Guid (+17 more)

### Community 16 - "Question Versioning & Scoring"
Cohesion: 0.23
Nodes (8): DiffResult, IEnumerable, IReadOnlyCollection, QuizQuestionVersioning, QuizQuestionUM, Fact, int, QuizQuestionVersioningTests

### Community 17 - "Audit Logs Controller"
Cohesion: 0.15
Nodes (13): CancellationToken, IQueryable, IReadOnlyList, Items, Task, Total, IAuditLogRepository, CancellationToken (+5 more)

### Community 18 - "Question Service & Image Assoc."
Cohesion: 0.11
Nodes (17): CancellationToken, ErrorMessage, Expression, Func, Guid, IsCustomMessage, List, Success (+9 more)

### Community 19 - "Backend Namespaces / Tests"
Cohesion: 0.08
Nodes (19): QuizAPI.Tests.Editing, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService, QuizAPI.Common, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService, QuizAPI.Controllers, QuizAPI.Tests.Grading, QuizAPI.ManyToManyTables, QuizAPI.DTOs.Quiz (+11 more)

### Community 20 - "Quiz Session Service"
Cohesion: 0.16
Nodes (9): List, IResult, Result, Guid, ILogger, List, Task, QuizSessionService (+1 more)

### Community 21 - "Build Tooling / Dev Deps"
Cohesion: 0.04
Nodes (45): devDependencies, autoprefixer, baseline-browser-mapping, @chromatic-com/storybook, cross-env, esbuild, eslint, @eslint/js (+37 more)

### Community 22 - "Filtering & Pagination Framework"
Cohesion: 0.04
Nodes (44): API Reference, Architecture, Auto-Resume After Disconnect, Backend, Backend (ASP.NET Core), Backend Methods (QuizHub), Client Events (IQuizClient), Common Issues (+36 more)

### Community 23 - "Auth Controller & Rate Limiting"
Cohesion: 0.13
Nodes (20): AllowAnonymous, Authorize, CancellationToken, DateTime, EnableRateLimiting, HttpGet, HttpPost, IActionResult (+12 more)

### Community 24 - "User Service"
Cohesion: 0.21
Nodes (9): CancellationToken, Guid, HashSet, IEnumerable, IQueryable, IReadOnlyList, Task, UserService (+1 more)

### Community 25 - "Question Models"
Cohesion: 0.13
Nodes (17): QuizAPI.Models.Statistics.Questions, DateTime, Guid, ICollection, List, QuestionBase, QuestionMediaType, QuestionVisibility (+9 more)

### Community 26 - "Audit & Repositories"
Cohesion: 0.07
Nodes (19): QuizAPI.DTOs.Files, QuizAPI.Services.AuthenticationService, QuizAPI.DTOs.Notification, QuizAPI.Controllers.Image.Services, QuizAPI.Services.Invitations, QuizAPI.Controllers.Files.Services, QuizAPI.DTOs.Audit, QuizAPI.Repositories (+11 more)

### Community 27 - "Filter UI Components"
Cohesion: 0.08
Nodes (45): ActiveFilterPill, ActiveFilterPills(), ActiveFilterPillsProps, DateRangeFilter(), DateRangeFilterProps, MultiSelect(), MultiSelectOption, MultiSelectProps (+37 more)

### Community 28 - "Backend Service Namespaces"
Cohesion: 0.07
Nodes (18): QuizAPI.Filtering, QuizAPI.Controllers.Questions.TestQuestions.Services, QuizAPI.Controllers.Quizzes, QuizAPI.Extensions, QuizAPI.Tests.Discovery, QuizAPI.Tests.TestSupport, QuizAPI.Services.CurrentUserService, QuizAPI.Controllers.Questions.TestQuestions (+10 more)

### Community 29 - "Reports Service & Controller"
Cohesion: 0.19
Nodes (14): CancellationToken, HttpGet, HttpPost, IActionResult, List, Task, ReportsController, QuestionAnalyticsRow (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (13): FileContentResult, Authorize, CancellationToken, HttpGet, HttpPost, IActionResult, IFormFile, List (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (9): CancellationToken, Guid, List, Task, IQuizService, DateTime, QuizDTO, QuizSummaryDTO (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (18): DateTime, Guid, ICollection, QuestionCategory, QuestionDifficulty, QuestionLanguage, User, Quiz (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (18): getQuizQuestions(), getQuizQuestionsQueryOptions(), useQuizQuestionsData(), UseQuizQuestionsOptions, QuizQuestions(), QuizCard(), QuizCardProps, secondsToMinutes() (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): 10. Edge cases & failure modes, 11. Concrete file change list, 12. Decisions made, 1. Goal, 2. The central problem, and why it mostly disappears, 2a. Why not `Unspecified`?, 2b. Difficulty resolution — strict, and incapable of creating entities, 2c. Per-question scoring (`pointSystem`, `timeLimitInSeconds`) (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (19): Guid, List, Task, IQuizSessionService, DateTime, Guid, List, TimeSpan (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (18): CancellationTokenSource, List, DateTime, RoundAnswer, CancellationToken, DateTime, IHubContext, ILogger (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (25): borderColors, icons, Notification(), NotificationProps, Error, Info, meta, Story (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (25): QuestionMedia(), UseQuizSessionReturn, MultiplayerQuestionView(), toCurrentQuestion(), FeedbackDisplay(), FeedbackDisplayProps, QuestionCard(), QuestionCardProps (+17 more)

### Community 39 - "Community 39"
Cohesion: 0.21
Nodes (13): getPermissionMatrix(), getPermissionMatrixQueryOptions(), permissionMatrixQueryKey, usePermissionMatrix(), updateRolePermission(), UpdateRolePermissionInput, useUpdateRolePermission(), UseUpdateRolePermissionOptions (+5 more)

### Community 40 - "Community 40"
Cohesion: 0.04
Nodes (112): getErrorAwareStyles(), ImageHandlerProps, useFormValidation(), ValidationError, ValidationErrorsDisplay(), ValidationErrorsDisplayProps, DeleteUserProps, TypeTheAnswerQuestionListProps (+104 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (15): AllowAnonymous, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (25): handleLoaderError(), quizLoader(), usersLoader(), getQuiz(), getQuizQueryOptions(), useQuizData(), UseQuizOptions, createUser() (+17 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (22): QuizAPI.DTOs.Settings, QuizAPI.Services.SettingsService, QuizAPI.Controllers.Settings, CancellationToken, HttpGet, HttpPut, IActionResult, Task (+14 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (12): DateTime, AuthResult, CancellationToken, Guid, Task, IRefreshTokenRepository, CancellationToken, Guid (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (29): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_URLS (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (14): exportReport(), fetchQuestionAnalytics(), fetchQuizPerformance(), QuestionAnalyticsRow, QuizPerformanceRow, ReportCriteria, ReportExportFormat, ReportType (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (8): Exception, Guid, IServiceProvider, Task, QuizHub, IReadOnlyList, Task, IQuizSessionManager

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (18): EmailVerificationBanner(), getRoles(), getRolesQueryOptions(), useRoles(), UseRolesOptions, resendVerification(), useResendVerification(), verifyEmail() (+10 more)

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
Cohesion: 0.09
Nodes (33): DataTableProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+25 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (11): Dictionary, AuditLogFilterFields, CategoryFilterFields, QuestionFilterFields, QuizFilterFields, UserFilterFields, HashSet, IEnumerable (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (5): ModelBuilder, ModelBuilder, PermissionSeeder, ModelBuilder, RoleSeeder

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (25): ChatApp.Models, ChatApp.DTOs, ChatMemberPresenceDto, ChatRoomDto, ChatRoomMemberDto, ChatUserRef, CreateChatRoomRequest, JoinRoomRequest (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (10): QuizAPI.Chat_System.Services, ConnectionService, ConcurrentDictionary, Guid, IEnumerable, Task, Guid, IEnumerable (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.11
Nodes (25): Alert, AlertDescription, AlertTitle, alertVariants, Progress, RadioGroup, RadioGroupItem, testQuestion() (+17 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (9): CancellationToken, HttpGet, IActionResult, Task, AuditLogsController, DateTime, Guid, AuditLogDTO (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.16
Nodes (12): AutomaticRetry, IBackgroundJobClient, IsCorrect, DateTime, Guid, HashSet, ILogger, IServiceScopeFactory (+4 more)

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (7): ConcurrentDictionary, int, IReadOnlyList, List, Task, InMemoryQuizSessionManager, Participant

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (14): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (17): CancellationToken, Guid, ILogger, IQueryable, List, Task, QuizService, QuizFilterParams (+9 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (12): AvailabilityResponse, fetchAvailability(), fetchInviteValidity(), InviteCodeValidityResponse, normalizeInviteCode(), useEmailAvailability(), useInviteCodeValidity(), useUsernameAvailability() (+4 more)

### Community 65 - "Community 65"
Cohesion: 0.17
Nodes (12): CancellationToken, ErrorMessage, Guid, IsCustomMessage, List, Success, Task, IQuestionService (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (12): 1. The 60-second mental model, 2. The env files — what they are and which is which, 3. How you get real error messages in development, 4. Follow `VITE_API_URL` from the code all the way to the VPS, 5. "Why a domain and not just the raw VPS IP?", 6. Quick reference, Common gotchas, Frontend Environments, Explained (dev vs prod, env files, and how the API URL reaches the VPS) (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (11): DateTime, Guid, ICollection, User, CancellationToken, Guid, IEnumerable, IQueryable (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (14): ProfileButtonProps, Avatar, AvatarFallback, AvatarImage, ALLOWED_AVATAR_ACCEPT, ALLOWED_AVATAR_TYPES, uploadAvatar(), useUploadAvatar() (+6 more)

### Community 69 - "Community 69"
Cohesion: 0.09
Nodes (20): InputField(), InputFieldProps, Error(), ErrorProps, FIELD_THEMES, FieldTheme, FieldWrapper(), FieldWrapperPassThroughProps (+12 more)

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (16): useGuestQuizSession(), UseGuestQuizSessionParams, createGuestQuizSession(), finishGuestSession(), getGuestCanPlay(), getGuestNextQuestion(), getGuestSessionResults(), submitGuestAnswer() (+8 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (6): Stream, Task, IImageService, ILogger, Task, ImageCleanUpService

### Community 72 - "Community 72"
Cohesion: 0.24
Nodes (5): ICollection, QuizQuestion, IEnumerable, List, QuizSessionMappers

### Community 73 - "Community 73"
Cohesion: 0.30
Nodes (5): O2Button(), ModeToggle(), ModeToggleProps, useThemeSetting(), SocialButtons()

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (15): ControllerBase, Task, ITestQuestionService, ILogger, Task, TestQuestionService, ActionResult, HttpPost (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (10): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (9): IQueryable, Guid, int, IQueryable, List, Task, PagedList, PaginationParams (+1 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (22): BCrypt.Net-Next (4.0.3), Bogus (35.6.1), ClosedXML (0.105.0), CsvHelper (33.0.1), Hangfire.AspNetCore (1.8.21), Hangfire.PostgreSql (1.20.13), Microsoft.AspNetCore.Authentication.JwtBearer (8.0.20), Microsoft.AspNetCore.SignalR (1.2.0) (+14 more)

### Community 78 - "Community 78"
Cohesion: 0.05
Nodes (55): DbContext, DbSet, IHostEnvironment, ILogger, IWebHostEnvironment, Stream, Task, ImageService (+47 more)

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (13): ActivityTimeout, Guid, List, Task, ISessionAbandonmentService, Guid, ILogger, List (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.16
Nodes (14): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+6 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (16): Guid, List, Task, IUserAnswerService, Guid, ILogger, List, Task (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (15): DateTime, Guid, List, AnswerOptionDTO, AnswerOptionForQuizPlaying, IndividualQuestionDTO, MultipleChoiceQuestionCM, MultipleChoiceQuestionUM (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (20): contentVersion, metadata, _dependencyType, description, _parameterType, parameters, resourceGroupLocation, resourceGroupName (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.32
Nodes (6): CancellationToken, Guid, IEnumerable, IReadOnlyList, Task, IUserRepository

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (11): QuizAPI.MongoDB.Models, IMongoCollection, DateTime, LobbyChatLog, ILogger, string, ILobbyChatArchiver, LobbyChatArchiver (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.26
Nodes (9): ActionResult, CancellationToken, HttpDelete, HttpGet, HttpPost, IActionResult, string, Task (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.16
Nodes (18): End, From, DateTime, List, AttemptsByDayPoint, QuizAnalyticsDto, QuizQuestionAnalyticsRow, ReportCriteria (+10 more)

### Community 88 - "Community 88"
Cohesion: 0.17
Nodes (5): DateTime, IReadOnlyList, List, Task, IQuizClient

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (11): DateTime, Guid, EmailVerificationToken, CancellationToken, Guid, Task, EmailVerificationTokenRepository, CancellationToken (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 91 - "Community 91"
Cohesion: 0.12
Nodes (14): QuizAPI.Services.QuizSessionServices, QuizAPI.Controllers.Quizzes.Services.QuizServices, QuizAPI.Hubs, QuizAPI.Controllers.Questions.Services, QuizAPI.Controllers.DataTransfer, QuizAPI.Services.Interfaces, QuizAPI.Hubs.Clients, QuizAPI.DTOs.User (+6 more)

### Community 92 - "Community 92"
Cohesion: 0.13
Nodes (17): QuizAPI.DTOs.DataTransfer, DateTime, Guid, List, CategoryExportRow, CategoryImportRow, DifficultyExportRow, DifficultyImportRow (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.17
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.21
Nodes (9): ConstantExpression, MethodInfo, Expression, Func, IQueryable, IReadOnlyList, LambdaExpression, Type (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (10): IMemoryCache, CancellationToken, Guid, HashSet, IQueryable, string, Task, TimeSpan (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.17
Nodes (11): CancellationToken, Guid, HashSet, IFormFile, ILogger, IReadOnlyList, IWebHostEnvironment, long (+3 more)

### Community 97 - "Community 97"
Cohesion: 0.18
Nodes (12): IEnumerable, List, Task, AnswerOptionService, IEnumerable, List, Task, IAnswerOptionService (+4 more)

### Community 98 - "Community 98"
Cohesion: 0.14
Nodes (18): extractErrorMessage(), handleQuestionFetchError(), isActiveSessionError(), useQuizSession(), UseQuizSessionParams, createQuizSession(), CreateQuizSessionInput, createQuizSessionInputSchema (+10 more)

### Community 99 - "Community 99"
Cohesion: 0.10
Nodes (23): DashboardLayout(), DashboardLayoutProps, canActOnResource(), hasPermission(), hasRole(), isSuperAdmin(), useAuthorization(), AppRootProps (+15 more)

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (4): dashboardEndpoints, DashboardFetcherConfig, DashboardResource, RoleAwareEndpointMap

### Community 101 - "Community 101"
Cohesion: 0.16
Nodes (13): QuizAPI.Controllers.Files, ActionResult, CancellationToken, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+5 more)

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (9): EnableRateLimiting, Guid, HttpGet, HttpPost, IActionResult, ProducesResponseType, string, Task (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.07
Nodes (25): MultiplayerQuestionViewProps, MultiplayerGame(), MultiplayerGameProps, Countdown, Match, mcQuestion, QuestionAnswered, QuestionMultipleChoice (+17 more)

### Community 104 - "Community 104"
Cohesion: 0.12
Nodes (16): aliases, components, utils, iconLibrary, registries, @react-bits, rsc, $schema (+8 more)

### Community 105 - "Community 105"
Cohesion: 0.06
Nodes (31): 1. TL;DR — when to reach for it, 2. What actually got built, 3. Everyday use, 4. What it's genuinely good at, 5. Where it falls short (be realistic), 6. How this project is wired to use it, 7. Rebuilding from scratch, Ask it a question (the part worth using) (+23 more)

### Community 106 - "Community 106"
Cohesion: 0.21
Nodes (11): ActionResult, Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult (+3 more)

### Community 107 - "Community 107"
Cohesion: 0.13
Nodes (14): DateTime, List, QuestionCategoryCM, QuestionCategoryDTO, DateTime, QuestionLanguageCM, QuestionLanguageDTO, Expression (+6 more)

### Community 108 - "Community 108"
Cohesion: 0.21
Nodes (3): Quiz editing (2026-07-02 — see docs/quiz/quiz-editing.md), Quiz full error, Start another quiz game

### Community 109 - "Community 109"
Cohesion: 0.21
Nodes (8): IOrderedQueryable, IQueryable, string, QuizVarietyOrdering, Fact, InlineData, Theory, QuizVarietyOrderingTests

### Community 110 - "Community 110"
Cohesion: 0.29
Nodes (10): QuestionReviewProps, QuizOverview(), QuizOverviewProps, QuizResultsProps, calculateQuizStats(), formatDuration(), getPerformanceLevel(), PerformanceLevel (+2 more)

### Community 111 - "Community 111"
Cohesion: 0.08
Nodes (24): 10. Local code prep — committed + pushed ✅, 11. CI build fix — MongoDB fully removed from DI ✅, 12. Cloudflare Origin certificate created + saved ✅, 13. `api.oxygenquiz.com` brought online (Nginx + Origin cert + Full strict) ✅, 14. Frontend live on `oxygenquiz.com` + admin login working ✅, 1. Code: dropped MongoDB (committed + pushed), 2. Server baseline hardening, 3. SSH key setup (desktop) (+16 more)

### Community 112 - "Community 112"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 113 - "Community 113"
Cohesion: 0.26
Nodes (9): CancellationToken, Guid, IFormFile, IReadOnlyList, Task, IFileService, DateTime, Guid (+1 more)

### Community 114 - "Community 114"
Cohesion: 0.28
Nodes (5): ICollection, QuizCM, QuizUM, QuizQuestionCM, QuizMappers

### Community 115 - "Community 115"
Cohesion: 0.25
Nodes (9): SettingsApplier(), applyFont(), FONT_OPTIONS, FONT_VARS, FontOption, FontZone, normalizeFont(), toCssValue() (+1 more)

### Community 116 - "Community 116"
Cohesion: 0.13
Nodes (10): QuizAPI.Services.Reports, QuizAPI.Services.DataTransfer, QuizAPI.DTOs.Reports, QuizAPI.Controllers.Reports, IEnumerable, JsonSerializerOptions, DataExportService, ExportFile (+2 more)

### Community 117 - "Community 117"
Cohesion: 0.03
Nodes (39): QuizAPI.Tests.Users, QuizAPI.Services.Permissions, QuizAPI.Data, QuizAPI.Migrations, QuizAPI.Services, QuizAPI.Controllers.Permissions, ModelSnapshot, ModelBuilder (+31 more)

### Community 118 - "Community 118"
Cohesion: 0.24
Nodes (8): DateTime, Guid, FileRecord, CancellationToken, Guid, IReadOnlyList, Task, FileRepository

### Community 119 - "Community 119"
Cohesion: 0.24
Nodes (8): DateTime, expiresAt, IConfiguration, int, IReadOnlyCollection, rawToken, tokenHash, TokenService

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
Cohesion: 0.15
Nodes (20): getSettings(), getSettingsQueryOptions(), useSettingsData(), updateSettings(), useUpdateSettings(), UseUpdateSettingsOptions, AppearanceSection(), AppearanceSectionProps (+12 more)

### Community 124 - "Community 124"
Cohesion: 0.22
Nodes (10): CancellationToken, Guid, HashSet, IFormFile, IHttpContextAccessor, ILogger, long, string (+2 more)

### Community 125 - "Community 125"
Cohesion: 0.33
Nodes (5): JsonSerializerOptions, List, Stream, Type, DataImportService

### Community 126 - "Community 126"
Cohesion: 0.22
Nodes (10): CanvasStrokeStyle, GridOffset, Squares(), SquaresProps, Prism(), PrismProps, useTheme(), EffectType (+2 more)

### Community 127 - "Community 127"
Cohesion: 0.15
Nodes (11): LoadingWaveProps, sizes, AllSizes, CustomText, Default, Fast, Muted, Quiz (+3 more)

### Community 128 - "Community 128"
Cohesion: 0.05
Nodes (37): MultiplayerContext, MultiplayerContextType, MultiplayerProvider(), ConnectionStatus, useConnectionStatus(), useMultiplayer(), CARD_ACCENTS, CardAccent (+29 more)

### Community 129 - "Community 129"
Cohesion: 0.22
Nodes (6): List, Expression, Func, IReadOnlyList, FilterOperator, FilterRule

### Community 130 - "Community 130"
Cohesion: 0.05
Nodes (62): Textarea, myQuestionKeys, questionKeys, quizQuestionKeys, deleteQuestion(), DeleteQuestionApiDTO, useDeleteQuestion(), UseDeleteQuestionOptions (+54 more)

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
Cohesion: 0.40
Nodes (4): DateTime, Guid, FullUserDTO, UserBasicDTO

### Community 135 - "Community 135"
Cohesion: 0.18
Nodes (14): Caddy Reverse Proxy (TLS + SPA), Invite-Code Gated Signup, Production Docker Compose Stack, MongoDB Removal (Ephemeral Chat), Dev PostgreSQL Container, Full-Stack Docker Compose, Backend (.NET) Tests Job, CI Deploy Gate (+6 more)

### Community 136 - "Community 136"
Cohesion: 0.40
Nodes (8): IReadOnlyList, MatchResult, PlayerRoundResult, QuestionResult, RoundOption, RoundQuestion, RoundQuestionView, ScoreboardEntry

### Community 137 - "Community 137"
Cohesion: 0.27
Nodes (7): DateTime, Guid, RefreshToken, CancellationToken, Guid, Task, RefreshTokenRepository

### Community 138 - "Community 138"
Cohesion: 0.04
Nodes (77): ColorCard(), ColorCardProps, GoBackButton(), AccordionContent, AccordionItem, AccordionTrigger, Badge(), BadgeProps (+69 more)

### Community 139 - "Community 139"
Cohesion: 0.28
Nodes (5): QuizAPI.Controllers.Totals, ActionResult, HttpGet, TotalsController, DashboardService

### Community 140 - "Community 140"
Cohesion: 0.15
Nodes (14): getCurrentState(), getCurrentStateQueryOptions(), useCurrentStateData(), UseCurrentStateOptions, submitAnswer(), SubmitAnswerInput, submitAnswerInputSchema, useSubmitAnswer() (+6 more)

### Community 143 - "Community 143"
Cohesion: 0.06
Nodes (30): 1. Quiz Session Flow, 2. Component Hierarchy, 3. Component Specifications, Accessibility, AnswerFeedback, API Integration, Architecture, Components and Interfaces (+22 more)

### Community 144 - "Community 144"
Cohesion: 0.04
Nodes (25): Migration, MigrationBuilder, InitialCreate, MigrationBuilder, SettingsFilesAuditLogsRolePermission, MigrationBuilder, AuditLogs_Notifications_RetireUpdatedAt, MigrationBuilder (+17 more)

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (7): CancellationToken, Task, IEmailSender, CancellationToken, ILogger, Task, LoggingEmailSender

### Community 146 - "Community 146"
Cohesion: 0.39
Nodes (7): base64(), makeTone(), renderSegments(), sample(), ToneSegment, toWavDataUri(), Wave

### Community 147 - "Community 147"
Cohesion: 0.22
Nodes (8): DrawerFilled(), Divider(), DividerProps, HeaderProps, HeaderComponent, HeaderComponentProps, HoverEffect(), HoverEffectProps

### Community 148 - "Community 148"
Cohesion: 0.18
Nodes (10): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, App(), AppProvider() (+2 more)

### Community 149 - "Community 149"
Cohesion: 0.05
Nodes (56): api, ApiFnReturnType, MutationConfig, getIndividualQuestion(), getIndividualQuestionQueryOptions(), useIndividualQuestionData(), UseIndividualQuestionOptions, createQuestionCategory() (+48 more)

### Community 150 - "Community 150"
Cohesion: 0.33
Nodes (5): CancellationToken, Guid, IReadOnlyList, Task, IFileRepository

### Community 151 - "Community 151"
Cohesion: 0.18
Nodes (16): fetchMyQuestions(), getMyMultipleChoiceQuestions(), getMyMultipleChoiceQuestionsQueryOptions(), GetMyQuestionsParams, getMyQuestionsTotal(), getMyQuestionsTotalQueryOptions(), getMyTrueFalseQuestions(), getMyTrueFalseQuestionsQueryOptions() (+8 more)

### Community 152 - "Community 152"
Cohesion: 0.31
Nodes (4): DataFormat, DataFormatExtensions, List, Stream

### Community 153 - "Community 153"
Cohesion: 0.11
Nodes (18): 10. The frontend — Cloudflare Worker, 11. Secrets & configuration, 12. Request lifecycle — following one API call, 13. Where the real build differs from the original plan, 14. At-a-glance summary, 1. The big picture in one paragraph, 2. The one constraint that shaped everything, 3. The domain — `oxygenquiz.com` (+10 more)

### Community 154 - "Community 154"
Cohesion: 0.14
Nodes (16): DashboardErrorElement(), MainErrorFallback(), TODO: Send to your error monitoring service (Sentry, LogRocket, etc.), apiError, MinimalError, RuntimeCrash, runtimeError, ServerConnectionFailure (+8 more)

### Community 155 - "Community 155"
Cohesion: 0.28
Nodes (7): BackgroundService, CancellationToken, ILogger, IServiceProvider, Task, TimeSpan, QuizSessionCleanupService

### Community 156 - "Community 156"
Cohesion: 0.12
Nodes (17): 10. Tests, 11. Operational runbook (for the test), 12. File map, 13. Not implemented (optional, from the plan), 1. How it works at a glance, 2. The feature flag, 3. Data model, 4. Code generation & hashing (+9 more)

### Community 157 - "Community 157"
Cohesion: 0.11
Nodes (13): QuizAPI.Middleware, QuizAPI.Controllers.Authentication, IExceptionHandler, IServiceCollection, CancellationToken, Exception, HttpContext, ILogger (+5 more)

### Community 158 - "Community 158"
Cohesion: 0.22
Nodes (8): coverlet.collector (6.0.2), Microsoft.EntityFrameworkCore.InMemory (8.0.20), Microsoft.NET.Test.Sdk (17.11.1), Moq (4.20.72), xunit (2.9.2), xunit.runner.visualstudio (2.8.2), net8.0, Microsoft.NET.Sdk

### Community 159 - "Community 159"
Cohesion: 0.22
Nodes (7): Guid, IHttpContextAccessor, CurrentUserService, Guid, ICurrentUserService, Guid, TestCurrentUserService

### Community 160 - "Community 160"
Cohesion: 0.12
Nodes (12): QuizAPI.Tests.Auth, QuizAPI.DTOs.Authentication, AuthResponseDTO, HashSet, NotACommonPasswordAttribute, Fact, InlineData, Theory (+4 more)

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
Nodes (16): Adding filtering to an entity (3 steps), Backend architecture (`QuizAPI.Filtering`), Decision: pagination lives in the body, Design goals, Filtering, Sorting & Pagination, Frontend architecture (`src/lib/filtering`), Migration path (remaining), Testing (+8 more)

### Community 167 - "Community 167"
Cohesion: 0.43
Nodes (7): Exception, AppException, AppValidationException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException

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
Cohesion: 0.19
Nodes (12): DrawerHeaderContent(), DrawerLinks(), ProfileButton, DrawerContent, DrawerContentProps, DrawerDescription, DrawerFooter(), DrawerHeader() (+4 more)

### Community 172 - "Community 172"
Cohesion: 0.29
Nodes (6): JoinForm(), LeaveLobbyDialog(), LobbyInfoBar(), LobbyInfoBarProps, MultiplayerLobbyPage(), MultiplayerLobbyPageProps

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
Cohesion: 0.25
Nodes (8): 1. Authorization rules, 2. API, 3. Backend implementation, 4. Frontend, 5. Tests, 6. File map, 7. Known limitations / follow-ups, Changing a User's Role

### Community 186 - "Community 186"
Cohesion: 0.13
Nodes (14): 1. Co-locate the file, 2. Use the CSF3 format with full typing, 3. Story the presentational component, not the data-fetching wrapper, 4. Mock complex props with a typed factory, 5. Use `render` only when a story needs more than static args, 6. Theme & providers, Canonical examples in this repo, How our setup works (+6 more)

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
Cohesion: 0.50
Nodes (3): Guid, string, GuestAccount

### Community 198 - "Community 198"
Cohesion: 0.17
Nodes (15): RFC-7807, authRequestInterceptor(), CUSTOM_ERROR_PATTERNS, isCustomErrorMessage(), llmApi, refreshAccessToken(), llmChat(), LlmChatInput (+7 more)

### Community 205 - "Community 205"
Cohesion: 0.40
Nodes (4): resourceId, type, dependencies, apis1

### Community 206 - "Community 206"
Cohesion: 0.15
Nodes (12): Architecture, AWS TLS Management, Backend (`OxygenBackend/QuizAPI/appsettings.*.json`), Deployment (AWS), FastAPI Microservice (`microservice/.env`), Frontend (`.env.development`, `.env.production`), Local Development Commands, OxygenQuiz (+4 more)

### Community 209 - "Community 209"
Cohesion: 0.36
Nodes (6): AdminImageUpload(), BaseImageUploadProps, ImageUploadProps, useImageUpload(), UserImageUpload(), UserImageUploadProps

### Community 210 - "Community 210"
Cohesion: 0.25
Nodes (8): AI quiz creation (2026-07-17 — see docs/quiz/ai-quiz-architecture.md), Auth enhancements, Code quality / cleanup, Known Issues & Deferred Improvements, Operations / deployment, Repo hygiene, Security hardening (defense-in-depth — no known active exploit), Seed / reference data

### Community 221 - "Community 221"
Cohesion: 0.30
Nodes (12): AppNotification, invalidateAll(), notificationKeys, notificationsQueryOptions(), useDeleteNotification(), useMarkAllNotificationsRead(), useMarkNotificationRead(), useMyNotifications() (+4 more)

### Community 224 - "Community 224"
Cohesion: 0.50
Nodes (3): type, dependencies, apis1

### Community 227 - "Community 227"
Cohesion: 0.12
Nodes (14): Import templates, Notes, Questions, Quizzes, Authorization summary, Discovery (lists, search, catalogue), Guests, How access is enforced (+6 more)

### Community 229 - "Community 229"
Cohesion: 0.15
Nodes (13): (A) Gate the multiplayer routes — frontend, (B) Use the account username — frontend, (C) Enforce identity on the hub — backend (the actual security), Current state, Design — three layers, Edge cases & decisions, Files to touch, Identity is client-supplied, not the account (+5 more)

### Community 230 - "Community 230"
Cohesion: 0.15
Nodes (12): Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Introduction, Note, Requirement 1: Quiz Interaction, Requirement 2: Progress Tracking (+4 more)

### Community 232 - "Community 232"
Cohesion: 0.67
Nodes (3): Lone tree silhouetted beneath the Milky Way in a starry night sky between hills, Large radio telescope satellite dish under a starry night sky with a meteor streak, The planet Saturn with its rings and the moon Titan, photographed from space

### Community 233 - "Community 233"
Cohesion: 0.67
Nodes (3): vite, O2 logo: 3D magnifying-glass forming the chemical symbol O2 with a superscript square, the OxygenQuiz app brand mark in teal, Vite logo: lightning-bolt mark in blue-to-purple and yellow gradient, the frontend build tool's default favicon

### Community 242 - "Community 242"
Cohesion: 0.19
Nodes (9): double, PointSystem, int, TimeSpan, QuizScoring, Fact, InlineData, Theory (+1 more)

### Community 269 - "TopNotification.stories.tsx"
Cohesion: 0.13
Nodes (14): QuestionMediaProps, AnsweredCorrectly, FinalQuestionComplete, FreshQuestion, LoadingNextQuestion, sampleQuestion, Story, QuizProgressProps (+6 more)

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
Cohesion: 0.17
Nodes (11): Data model, Frontend, Growth & cleanup, Migration (run on your machine — not yet generated), Quiz editing & version pinning, Session pinning (editor-vs-player), Tests, The design in one paragraph (+3 more)

### Community 275 - "IImageService"
Cohesion: 0.53
Nodes (5): QuizAPI.DTOs.Permission, List, PermissionDTO, PermissionMatrixDTO, RolePermissionsDTO

### Community 276 - "InviteCodeRepository"
Cohesion: 0.33
Nodes (5): Backend extras, Backend (VPS, Docker), Deploy Cheat Sheet, Frontend (Cloudflare Workers — desktop only, no VPS), Quick reference

### Community 277 - "Implementation Plan — Invite-Code Signup Gate"
Cohesion: 0.08
Nodes (22): 10. Operational runbook, 1. Design decisions (and why), 2. Data model, 3. Repository, 4. Signup flow, 5. Code generation, 6. Disable guest play during the test (optional), 7. Frontend (+14 more)

### Community 278 - "Production Runbook — oxygenquiz.com on Hetzner"
Cohesion: 0.29
Nodes (6): DateTime, expiresAt, IReadOnlyCollection, rawToken, tokenHash, ITokenService

### Community 279 - "Image Upload Flow (ImageAsset pipeline)"
Cohesion: 0.17
Nodes (11): 1. Upload — `POST /api/ImageUpload/question`, 2. Associate — `POST /api/ImageUpload/associate`, Cleanup job, Components, Endpoints, Image Upload Flow (ImageAsset pipeline), `ImageAsset` schema, Lifecycle (sequence) (+3 more)

### Community 280 - "Quiz Answer Submission & Grading"
Cohesion: 0.10
Nodes (18): Grading rules (`AnswerGradingService.DetermineCorrectnessAsync`), Instant feedback result (`InstantFeedbackAnswerResultDto`), Key files, Multiplayer, Quiz Answer Submission & Grading, Scoring, Submission flow (`SubmitAnswerAsync`), Submitting an answer (`UserAnswerCM`) (+10 more)

### Community 284 - "Generic File Storage (Files entity)"
Cohesion: 0.20
Nodes (9): Avatar change (implemented), Can both systems coexist? Yes., Endpoints (`Controllers/Files/FilesController.cs`, `[Authorize]`), `FileRecord` schema (table `Files`), Future convergence (not now), Generic File Storage (Files entity), Purpose, Required vs optional (+1 more)

### Community 285 - "Getting Started — Required Software & Setup"
Cohesion: 0.20
Nodes (10): 1. Database, 2. Backend API, 3. Frontend, First login, Getting Started — Required Software & Setup, Option A — Docker Compose (quickest), Option B — Run locally (without Docker), Optional — AI / LLM chat microservice (+2 more)

### Community 287 - "Deployment Runbook — quick commands"
Cohesion: 0.18
Nodes (11): 1. Connect to the server, 2. Check the current state of things, 3. Everyday operations, 4. Deploying a code change, 4a. Backend change (desktop → GitHub → server), 4b. Frontend change (desktop → Cloudflare, no server), 5. DONE — Data Protection fix + DNS + CI fix + Origin cert (2026-07-03 → 07-04), 6. ✅ DONE (2026-07-04) — bring `api.oxygenquiz.com` online (Nginx + Origin cert) (+3 more)

### Community 288 - "Audit Logging"
Cohesion: 0.22
Nodes (8): Adding a new audited action, Audit Logging, How to read it, How to write one, Purpose, What a row records, What NOT to audit, Where it's used today

### Community 289 - "Rate Limiting"
Cohesion: 0.22
Nodes (9): Endpoint policies, Rate Limiting, Rejection behavior, Related, Testing it, Trusting the client IP, Tuning, What's configured (+1 more)

### Community 292 - "OxygenQuiz — Session Handoff"
Cohesion: 0.29
Nodes (6): Conventions we settled on, OPEN LOOSE ENDS (do these / keep in mind), OxygenQuiz — Session Handoff, Possible next steps we discussed, Project, What was built this session

### Community 294 - "upload-file.ts"
Cohesion: 0.33
Nodes (4): FileRecord, uploadFile(), UploadFileInput, useUploadFile()

### Community 295 - "enter-databases.md"
Cohesion: 0.33
Nodes (5): How to execute into each database (postgres or mongodb) to verify the existance of data, MONGODB via CMD, MONGODB via Docker, POSTGRES via CMD, POSTGRES via Docker

### Community 296 - "MongoDB — disabled (and how to bring it back)"
Cohesion: 0.33
Nodes (6): How to re-add MongoDB (when the persistent chat system lands), MongoDB — disabled (and how to bring it back), Related, What changed, What was deliberately **kept** (dormant, for the future chat system), Why it was removed

### Community 297 - "Reference data (importable)"
Cohesion: 0.33
Nodes (5): About the category colour (the quiz-select UX), Field reference, Files, How to import, Reference data (importable)

### Community 298 - "get-individual-question.ts"
Cohesion: 0.11
Nodes (20): QueryConfig, getQuizAnalytics(), getQuizAnalyticsQueryOptions(), useQuizAnalytics(), UseQuizAnalyticsOptions, getTotalUsers(), getTotalUsersQueryOptions(), useTotalUsersData() (+12 more)

### Community 301 - "QuestionDifficultyDTO"
Cohesion: 0.50
Nodes (3): DateTime, QuestionDifficultyCM, QuestionDifficultyDTO

## Knowledge Gaps
- **1427 isolated node(s):** `config`, `preview`, `QuizAPI.Tests.Discovery`, `QuizAPI.Tests.Editing`, `QuizAPI.Tests.Grading` (+1422 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **244 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApplicationDbContext` connect `Community 78` to `REST Controller Base`, `Community 137`, `Invite Codes API`, `Community 139`, `Answer Grading Service`, `Quiz Session Service`, `Question Models`, `Community 30`, `Community 159`, `Community 32`, `Community 43`, `Community 44`, `Community 51`, `Community 54`, `Community 59`, `Community 62`, `Community 67`, `Community 72`, `Community 74`, `Community 79`, `Community 80`, `Community 81`, `Community 86`, `Community 87`, `Community 89`, `Community 95`, `Community 97`, `Community 106`, `Community 107`, `Community 117`, `Community 118`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `DataTransferController` connect `Community 30` to `Community 159`, `Community 65`, `Avatar Service (backend)`, `Community 74`, `Community 78`, `Community 116`, `Community 91`, `Community 92`, `Community 31`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `QuizAPI.Data` connect `Community 117` to `Backend Namespaces / Tests`, `Audit & Repositories`, `Community 91`, `Backend Service Namespaces`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `config`, `preview`, `QuizAPI.Tests.Discovery` to the rest of the system?**
  _1479 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Card & Text Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Form & Select UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.043324898397362165 - nodes in this community are weakly interconnected._
- **Should `Background & Drawer UI` be split into smaller, more focused modules?**
  _Cohesion score 0.03717047979343061 - nodes in this community are weakly interconnected._