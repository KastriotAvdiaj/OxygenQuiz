# Graph Report - OxygenQuiz  (2026-07-09)

## Corpus Check
- 893 files · ~1,498,291 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5314 nodes · 12706 edges · 516 communities (247 shown, 269 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 480 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4eee88d9`
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
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
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
- ReportDtos.cs
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
- TestQuestionService
- IAnswerGradingService
- IInviteCodeGenerator
- Generic File Storage (Files entity)
- Getting Started — Required Software & Setup
- get-quiz-analytics.ts
- Deployment Runbook — quick commands
- Audit Logging
- Rate Limiting
- PointSystem
- .OnModelCreating
- OxygenQuiz — Session Handoff
- NotACommonPasswordAttribute
- upload-file.ts
- enter-databases.md
- MongoDB — disabled (and how to bring it back)
- Reference data (importable)
- get-individual-question.ts
- QuizEditingVersioning
- Notifications-store.ts
- QuestionDifficultyDTO
- 20260612120000_RemoveUniversitetiDrejtimi.Designer.cs
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
- Client-Side Room Code Generation
- Duplicate Join Logic (resolved)
- Multiplayer Lobby Identified Improvements
- Missing Error Boundaries

## God Nodes (most connected - your core abstractions)
1. `cn()` - 103 edges
2. `Button` - 98 edges
3. `QuizAPI.Models` - 88 edges
4. `ApplicationDbContext` - 74 edges
5. `useNotifications` - 68 edges
6. `QuizAPI.Data` - 53 edges
7. `Card` - 50 edges
8. `Result` - 48 edges
9. `QuestionType` - 46 edges
10. `api` - 45 edges

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

## Communities (516 total, 269 thin omitted)

### Community 0 - "UI Card & Text Components"
Cohesion: 0.05
Nodes (59): AccordionContent, AccordionItem, AccordionTrigger, Badge(), BadgeProps, badgeVariants, Card, CardContent (+51 more)

### Community 1 - "File Upload & LLM API (frontend)"
Cohesion: 0.06
Nodes (36): llmApi, llmChat(), LlmChatInput, llmChatInputSchema, LlmChatResponse, useLlmChat(), UseLlmChatOptions, ApiFnReturnType (+28 more)

### Community 2 - "Form & Select UI Primitives"
Cohesion: 0.09
Nodes (55): LiftedButton, LiftedButtonProps, useNotifications, FormDrawer(), Form(), Input, Label, Separator (+47 more)

### Community 3 - "Background & Drawer UI"
Cohesion: 0.06
Nodes (36): InputField(), InputFieldProps, Button, ButtonProps, buttonVariants, FancyButtonColors, ConfirmationDialog(), ConfirmationDialogProps (+28 more)

### Community 4 - "Button & Notification UI"
Cohesion: 0.14
Nodes (17): Authorization(), AuthorizationProps, canActOnResource(), hasPermission(), hasRole(), isSuperAdmin(), OwnedResource, ROLES (+9 more)

### Community 5 - "Avatar Service (backend)"
Cohesion: 0.06
Nodes (45): BaseApiController, CancellationToken, Guid, IFormFile, Task, IAvatarService, CancellationToken, Guid (+37 more)

### Community 6 - "REST Controller Base"
Cohesion: 0.06
Nodes (41): ActionResult, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+33 more)

### Community 7 - "DataTable & Sheet UI"
Cohesion: 0.08
Nodes (50): DataTable(), DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, Demo (+42 more)

### Community 8 - "Pagination & Audit-Log Queries"
Cohesion: 0.10
Nodes (31): api, cleanQueryParams(), extractPaginationFromHeaders(), getMultipleChoiceQuestions(), GetMultipleChoiceQuestionsParams, getMultipleChoiceQuestionsQueryOptions(), useMultipleChoiceQuestionData(), UseMultipleChoiceQuestionOptions (+23 more)

### Community 9 - "Auth & App Bootstrap (frontend)"
Cohesion: 0.08
Nodes (24): App(), userAuthLoader, RedirectIfLoggedIn(), AppProvider(), AboutUs, AccessDeniedPage, AppRoot, AppRouter() (+16 more)

### Community 10 - "Invite Codes API"
Cohesion: 0.10
Nodes (24): QuizAPI.DTOs.Invitations, ActionResult, CancellationToken, HttpGet, HttpPost, IActionResult, IReadOnlyList, Task (+16 more)

### Community 11 - "Questions API Controller"
Cohesion: 0.13
Nodes (19): Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, Task (+11 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, date-fns, framer-motion, gsap, @gsap/react, @hookform/resolvers (+45 more)

### Community 14 - "Data Import/Export"
Cohesion: 0.06
Nodes (44): DataTransferControls(), DataTransferControlsProps, exportData(), ExportFormat, EXTENSION, importData(), ImportResult, TransferEntity (+36 more)

### Community 15 - "Answer Grading Service"
Cohesion: 0.10
Nodes (23): GradingResult, Task, ISubmitAnswerService, Guid, ILogger, QuizSessionOptions, Task, SubmitAnswerService (+15 more)

### Community 16 - "Question Versioning & Scoring"
Cohesion: 0.23
Nodes (8): DiffResult, IEnumerable, IReadOnlyCollection, QuizQuestionVersioning, QuizQuestionUM, Fact, int, QuizQuestionVersioningTests

### Community 17 - "Audit Logs Controller"
Cohesion: 0.07
Nodes (32): CancellationToken, HttpGet, IActionResult, Task, AuditLogsController, DateTime, Guid, AuditLogDTO (+24 more)

### Community 18 - "Question Service & Image Assoc."
Cohesion: 0.15
Nodes (12): CancellationToken, Expression, Func, Guid, IQueryable, List, Task, QuestionService (+4 more)

### Community 19 - "Backend Namespaces / Tests"
Cohesion: 0.07
Nodes (20): QuizAPI.Tests.Editing, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService, QuizAPI.Controllers.Quizzes.Services.QuizServices, QuizAPI.Common, QuizAPI.Controllers, QuizAPI.Middleware, QuizAPI.DTOs.Quiz, QuizAPI.Extensions (+12 more)

### Community 20 - "Quiz Session Service"
Cohesion: 0.13
Nodes (11): Guid, List, Task, ISessionAbandonmentService, Guid, ILogger, List, Task (+3 more)

### Community 21 - "Build Tooling / Dev Deps"
Cohesion: 0.05
Nodes (44): devDependencies, autoprefixer, baseline-browser-mapping, @chromatic-com/storybook, cross-env, esbuild, eslint, @eslint/js (+36 more)

### Community 22 - "Filtering & Pagination Framework"
Cohesion: 0.05
Nodes (38): API Reference, Architecture, Auto-Resume After Disconnect, Backend, Backend (ASP.NET Core), Backend Methods (QuizHub), Client Events (IQuizClient), Common Issues (+30 more)

### Community 23 - "Auth Controller & Rate Limiting"
Cohesion: 0.13
Nodes (20): AllowAnonymous, Authorize, CancellationToken, DateTime, EnableRateLimiting, HttpGet, HttpPost, IActionResult (+12 more)

### Community 24 - "User Service"
Cohesion: 0.13
Nodes (16): CancellationToken, Guid, HashSet, IEnumerable, IQueryable, IReadOnlyList, List, Task (+8 more)

### Community 25 - "Question Models"
Cohesion: 0.16
Nodes (13): DateTime, Guid, ICollection, List, QuestionBase, QuestionVisibility, TrueFalseQuestion, TypeTheAnswerQuestion (+5 more)

### Community 26 - "Audit & Repositories"
Cohesion: 0.11
Nodes (14): QuizAPI.Services.Invitations, QuizAPI.DTOs.Audit, QuizAPI.Repositories, QuizAPI.Tests.Users, QuizAPI.Services.Audit, QuizAPI.Services.Permissions, QuizAPI.Data, QuizAPI.Models (+6 more)

### Community 27 - "Filter UI Components"
Cohesion: 0.10
Nodes (38): ActiveFilterPill, ActiveFilterPills(), ActiveFilterPillsProps, DateRangeFilter(), DateRangeFilterProps, MultiSelect(), MultiSelectOption, MultiSelectProps (+30 more)

### Community 28 - "Backend Service Namespaces"
Cohesion: 0.10
Nodes (15): QuizAPI.Filtering, QuizAPI.Controllers.Questions.Services, QuizAPI.Controllers.DataTransfer, QuizAPI.Controllers.Questions.TestQuestions.Services, QuizAPI.Mapping, QuizAPI.DTOs.User, QuizAPI.Services.CurrentUserService, QuizAPI.Controllers.Questions.TestQuestions (+7 more)

### Community 29 - "Reports Service & Controller"
Cohesion: 0.20
Nodes (15): CancellationToken, HttpGet, HttpPost, IActionResult, List, Task, ReportsController, QuestionAnalyticsRow (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (13): FileContentResult, Authorize, CancellationToken, HttpGet, HttpPost, IActionResult, IFormFile, List (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (13): CancellationToken, Guid, List, Task, IQuizService, DateTime, ICollection, QuizCM (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (17): DateTime, Guid, ICollection, QuestionCategory, QuestionDifficulty, QuestionLanguage, User, Quiz (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (13): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (25): RFC-7807, MultiplayerContext, MultiplayerContextType, MultiplayerProvider(), API_BASE, authRequestInterceptor(), CUSTOM_ERROR_PATTERNS, isCustomErrorMessage() (+17 more)

### Community 35 - "Community 35"
Cohesion: 0.23
Nodes (7): List, IResult, Result, Guid, List, Task, IQuizSessionService

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (20): List, DateTime, IReadOnlyList, MatchResult, PlayerRoundResult, QuestionResult, RoundAnswer, RoundOption (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (11): borderColors, icons, Notification(), NotificationProps, Error, Info, meta, Story (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (34): MultiplayerQuestionView(), MultiplayerQuestionViewProps, toCurrentQuestion(), RoundQuestionView, FeedbackDisplay(), FeedbackDisplayProps, QuestionCard(), QuestionCardProps (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (13): quizLoader(), getQuiz(), getQuizQueryOptions(), getQuizQuestions(), getQuizQuestionsQueryOptions(), useQuizQuestionsData(), UseQuizQuestionsOptions, useQuizData() (+5 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (36): BulkSettingsPanel(), SmallBaseQuestionCard(), SmallBaseQuestionCardProps, SmallQuestionFooter(), SmallQuestionFooterProps, SmallQuestionHeader(), SmallQuestionHeaderProps, ExistingSmallQuestionCardProps (+28 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (15): AllowAnonymous, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (21): handleLoaderError(), quizSelectionLoader(), usersLoader(), getPublicQuizzesQueryOptions(), usePublicQuizzesData(), createUser(), CreateUserInput, createUserInputSchema (+13 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (22): QuizAPI.DTOs.Settings, QuizAPI.Services.SettingsService, QuizAPI.Controllers.Settings, CancellationToken, HttpGet, HttpPut, IActionResult, Task (+14 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (18): DateTime, AuthResult, CancellationToken, Guid, Task, IRefreshTokenRepository, CancellationToken, Guid (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (29): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_URLS (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (14): exportReport(), fetchQuestionAnalytics(), fetchQuizPerformance(), QuestionAnalyticsRow, QuizPerformanceRow, ReportCriteria, ReportExportFormat, ReportType (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (8): Exception, Guid, IServiceProvider, Task, QuizHub, IReadOnlyList, Task, IQuizSessionManager

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (34): PaginationControlsProps, AuditLogsResult, getAuditLogs(), GetAuditLogsParams, getAuditLogsQueryOptions(), useAuditLogsData(), CreateQuizFormProps, QuizProperties() (+26 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (12): QuizAPI.Controllers.Image, IImageFormat, HttpPost, IActionResult, IFormFile, ILogger, int, IWebHostEnvironment (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.30
Nodes (11): IActionResult, BaseApiController, Authorize, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (7): Fact, IConfiguration, InlineData, Mock, Task, Theory, AuthenticationServiceTests

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (22): DataTableProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (17): ActiveFilterPills(), ActiveFilterPillsProps, FilterActions(), FilterAction, FilterState, initialFilterState, FilterPanel(), FilterPresets() (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (5): QuizAPI.Controllers.Totals, ActionResult, HttpGet, TotalsController, DashboardService

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (25): ChatApp.Models, ChatApp.DTOs, ChatMemberPresenceDto, ChatRoomDto, ChatRoomMemberDto, ChatUserRef, CreateChatRoomRequest, JoinRoomRequest (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (10): QuizAPI.Chat_System.Services, ConnectionService, ConcurrentDictionary, Guid, IEnumerable, Task, Guid, IEnumerable (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.11
Nodes (24): Alert, AlertDescription, AlertTitle, alertVariants, Progress, RadioGroup, RadioGroupItem, testQuestion() (+16 more)

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (6): createTypeTheAnswerQuestion(), CreateTypeTheAnswerQuestionInput, createTypeTheAnswerQuestionInputSchema, transformFormData(), UseCreateTypeTheAnswerQuestionOptions, UnspecifiedIds

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (13): AutomaticRetry, IBackgroundJobClient, IsCorrect, DateTime, Guid, HashSet, ILogger, IServiceScopeFactory (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (13): CancellationTokenSource, ConcurrentDictionary, int, IReadOnlyList, List, Task, InMemoryQuizSessionManager, ConcurrentDictionary (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (12): QuizAPI.DTOs.Files, QuizAPI.Services.AuthenticationService, QuizAPI.Controllers.Files.Services, QuizAPI.Tests.Auth, QuizAPI.Controllers.Notifications.Services, QuizAPI.Controllers.Authentication, QuizAPI.DTOs.Authentication, QuizAPI.Services.Email (+4 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (14): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (13): Guid, ILogger, List, Task, QuizService, CancellationToken, Guid, IDbContextTransaction (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (17): StepsProps, apiService, AvailabilityResponse, fetchAvailability(), fetchInviteValidity(), InviteCodeValidityResponse, normalizeInviteCode(), useEmailAvailability() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.17
Nodes (12): CancellationToken, ErrorMessage, Guid, IsCustomMessage, List, Success, Task, IQuestionService (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.21
Nodes (7): ErrorMessage, IsCustomMessage, Success, CancellationToken, Guid, Task, IQuestionRepository

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (11): DateTime, Guid, ICollection, User, CancellationToken, Guid, IEnumerable, IQueryable (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (14): ProfileButtonProps, Avatar, AvatarFallback, AvatarImage, ALLOWED_AVATAR_ACCEPT, ALLOWED_AVATAR_TYPES, uploadAvatar(), useUploadAvatar() (+6 more)

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (10): Error(), ErrorProps, FieldWrapper(), FieldWrapperPassThroughProps, FieldWrapperProps, InputProps, questionTypeColors, variantStyles (+2 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (19): useGuestQuizSession(), UseGuestQuizSessionParams, createGuestQuizSession(), finishGuestSession(), getGuestCanPlay(), getGuestNextQuestion(), getGuestSessionResults(), submitGuestAnswer() (+11 more)

### Community 71 - "Community 71"
Cohesion: 0.16
Nodes (30): react, DemoDialog(), TestDialog(), TabsContent, TabsList, TabsTrigger, useDebounce(), useDisclosure() (+22 more)

### Community 72 - "Community 72"
Cohesion: 0.11
Nodes (20): createMultipleChoiceQuestion(), CreateMultipleChoiceQuestionInput, createMultipleChoiceQuestionInputSchema, UseCreateMultipleChoiceQuestionOptions, updateMultipleChoiceQuestion(), UpdateMultipleChoiceQuestionInput, updateMultipleChoiceQuestionInputSchema, useUpdateMultipleChoiceQuestion() (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.09
Nodes (34): getErrorAwareStyles(), ImageHandlerProps, useFormValidation(), ValidationError, ValidationErrorsDisplay(), ValidationErrorsDisplayProps, CreateQuizInput, getQuestionTypeStyles() (+26 more)

### Community 74 - "Community 74"
Cohesion: 0.20
Nodes (10): ControllerBase, Task, ITestQuestionService, ActionResult, HttpPost, ILogger, ProducesResponseType, Task (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (7): API (`api/reports`, `[Authorize]`, scoped to the current user), Criteria, Dynamic Reports, Extending, Files, On-screen filters (and export parity), Reports

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (14): HttpResponse, CancellationToken, IQueryable, QuizSummaryDTO, HttpExtensions, Guid, int, IQueryable (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (22): BCrypt.Net-Next (4.0.3), Bogus (35.6.1), ClosedXML (0.105.0), CsvHelper (33.0.1), Hangfire.AspNetCore (1.8.21), Hangfire.PostgreSql (1.20.13), Microsoft.AspNetCore.Authentication.JwtBearer (8.0.20), Microsoft.AspNetCore.SignalR (1.2.0) (+14 more)

### Community 78 - "Community 78"
Cohesion: 0.34
Nodes (6): Fact, InlineData, List, Task, Theory, AnswerGradingServiceTests

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (9): ActivityTimeout, Guid, ILogger, List, QuizSessionOptions, Task, TimeSpan, SessionAbandonmentService (+1 more)

### Community 80 - "Community 80"
Cohesion: 0.16
Nodes (14): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+6 more)

### Community 81 - "Community 81"
Cohesion: 0.19
Nodes (9): Guid, List, Task, Guid, HttpDelete, HttpGet, IActionResult, ProducesResponseType (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.19
Nodes (16): DateTime, Guid, List, AnswerOptionDTO, AnswerOptionForQuizPlaying, IndividualQuestionDTO, MultipleChoiceQuestionCM, MultipleChoiceQuestionUM (+8 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (20): contentVersion, metadata, _dependencyType, description, _parameterType, parameters, resourceGroupLocation, resourceGroupName (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.38
Nodes (7): Fact, Guid, int, IReadOnlyList, Mock, Task, UserServiceRoleTests

### Community 85 - "Community 85"
Cohesion: 0.15
Nodes (11): QuizAPI.MongoDB.Models, IMongoCollection, DateTime, LobbyChatLog, ILogger, string, ILobbyChatArchiver, LobbyChatArchiver (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.17
Nodes (14): QuizAPI.DTOs.Permission, ActionResult, CancellationToken, HttpDelete, HttpGet, HttpPost, IActionResult, string (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (11): End, From, CancellationToken, DateTime, Guid, IEnumerable, List, Task (+3 more)

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
Cohesion: 0.14
Nodes (11): QuizAPI.Services.QuizSessionServices, QuizAPI.DTOs.Notification, QuizAPI.Hubs, QuizAPI.Controllers.Image.Services, QuizAPI.Services.Interfaces, QuizAPI.Hubs.Clients, QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices, Hub (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.14
Nodes (17): QuizAPI.DTOs.DataTransfer, DateTime, Guid, List, CategoryExportRow, CategoryImportRow, DifficultyExportRow, DifficultyImportRow (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (5): ILogger, IWebHostEnvironment, Stream, Task, ImageService

### Community 94 - "Community 94"
Cohesion: 0.08
Nodes (27): ConstantExpression, Dictionary, ExpressionVisitor, MethodInfo, CategoryFilterFields, QuestionFilterFields, QuizFilterFields, UserFilterFields (+19 more)

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
Cohesion: 0.12
Nodes (23): extractErrorMessage(), handleQuestionFetchError(), isActiveSessionError(), useQuizSession(), UseQuizSessionParams, UseQuizSessionReturn, createQuizSession(), CreateQuizSessionInput (+15 more)

### Community 99 - "Community 99"
Cohesion: 0.15
Nodes (14): DashboardLayout(), DashboardLayoutProps, AppRootProps, DashboardHeader(), DashboardNav(), DashboardNavProps, adminDashboardNavButtons, DashboardNavItem (+6 more)

### Community 100 - "Community 100"
Cohesion: 0.07
Nodes (45): dashboardEndpoints, DashboardFetcherConfig, DashboardResource, RoleAwareEndpointMap, QuestionTabContentProps, DeleteUserProps, TestQuestionButtonProps, TrueFalseQuestionCardProps (+37 more)

### Community 101 - "Community 101"
Cohesion: 0.16
Nodes (13): QuizAPI.Controllers.Files, ActionResult, CancellationToken, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+5 more)

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (9): EnableRateLimiting, Guid, HttpGet, HttpPost, IActionResult, ProducesResponseType, string, Task (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.08
Nodes (23): MultiplayerGame(), MultiplayerGameProps, Countdown, Match, mcQuestion, QuestionAnswered, QuestionMultipleChoice, QuestionTrueFalse (+15 more)

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
Cohesion: 0.15
Nodes (12): DateTime, List, QuestionCategoryCM, QuestionCategoryDTO, DateTime, QuestionLanguageCM, QuestionLanguageDTO, SecondaryMappers (+4 more)

### Community 108 - "Community 108"
Cohesion: 0.16
Nodes (3): Quiz editing (2026-07-02 — see docs/quiz/quiz-editing.md), Quiz full error, Start another quiz game

### Community 109 - "Community 109"
Cohesion: 0.21
Nodes (8): IOrderedQueryable, IQueryable, string, QuizVarietyOrdering, Fact, InlineData, Theory, QuizVarietyOrderingTests

### Community 110 - "Community 110"
Cohesion: 0.20
Nodes (9): Checkbox, CategoryBadge, DifficultyBadge, ImageBadge, LanguageBadge, MultipleChoiceBadges, SelectionStatusIndicator, TrueFalseBadges (+1 more)

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
Cohesion: 0.09
Nodes (21): Guid, List, Task, DateTime, Guid, List, TimeSpan, CurrentQuestionDto (+13 more)

### Community 115 - "Community 115"
Cohesion: 0.29
Nodes (8): SettingsApplier(), getSettings(), getSettingsQueryOptions(), useSettingsData(), updateSettings(), useUpdateSettings(), UseUpdateSettingsOptions, AppProviderProps

### Community 116 - "Community 116"
Cohesion: 0.22
Nodes (6): QuizAPI.Services.DataTransfer, IEnumerable, JsonSerializerOptions, DataExportService, ExportFile, IDataExportService

### Community 117 - "Community 117"
Cohesion: 0.14
Nodes (8): QuizAPI.Migrations, ModelSnapshot, ModelBuilder, AddUserSettings, ModelBuilder, ReworkQuizVisibilityToStatus, ModelBuilder, ApplicationDbContextModelSnapshot

### Community 118 - "Community 118"
Cohesion: 0.24
Nodes (8): DateTime, Guid, FileRecord, CancellationToken, Guid, IReadOnlyList, Task, FileRepository

### Community 119 - "Community 119"
Cohesion: 0.24
Nodes (8): DateTime, expiresAt, IConfiguration, int, IReadOnlyCollection, rawToken, tokenHash, TokenService

### Community 120 - "Community 120"
Cohesion: 0.10
Nodes (19): 10. Common gotchas / troubleshooting, 11. Cheat sheet, 1. The 60-second mental model, 2. What is Cloudflare, and what are Workers?, 3. What is Wrangler?, 4. The files that control all this, 5. How to deploy — the actual steps, 6. Why running it on *your* machine updates the *live* app (+11 more)

### Community 121 - "Community 121"
Cohesion: 0.24
Nodes (11): getPermissionMatrix(), getPermissionMatrixQueryOptions(), permissionMatrixQueryKey, usePermissionMatrix(), updateRolePermission(), UpdateRolePermissionInput, useUpdateRolePermission(), UseUpdateRolePermissionOptions (+3 more)

### Community 122 - "Community 122"
Cohesion: 0.21
Nodes (11): getGradingStatus(), getQuizSession(), getSessionResults(), useGetGradingStatus(), UseGetGradingStatusOptions, useGetQuizSession(), UseGetQuizSessionOptions, useGetSessionResults() (+3 more)

### Community 123 - "Community 123"
Cohesion: 0.24
Nodes (11): AppearanceSection(), AppearanceSectionProps, AudioSection(), AudioSectionProps, Row(), Section(), VolumeSlider(), TypographySection() (+3 more)

### Community 124 - "Community 124"
Cohesion: 0.22
Nodes (10): CancellationToken, Guid, HashSet, IFormFile, IHttpContextAccessor, ILogger, long, string (+2 more)

### Community 125 - "Community 125"
Cohesion: 0.26
Nodes (6): JsonSerializerOptions, List, Stream, Type, DataImportService, IDataImportService

### Community 126 - "Community 126"
Cohesion: 0.13
Nodes (16): CanvasStrokeStyle, GridOffset, Squares(), SquaresProps, Lightning(), LightningProps, EmailVerificationBanner(), EffectType (+8 more)

### Community 127 - "Community 127"
Cohesion: 0.15
Nodes (11): LoadingWaveProps, sizes, AllSizes, CustomText, Default, Fast, Muted, Quiz (+3 more)

### Community 128 - "Community 128"
Cohesion: 0.06
Nodes (39): ConnectionStatus, useConnectionStatus(), useMultiplayer(), CreateLobby(), CreateLobbyDialog(), CreateLobbyDialogProps, JoinLobbyDialog(), JoinLobbyDialogProps (+31 more)

### Community 129 - "Community 129"
Cohesion: 0.21
Nodes (11): createQuestionDifficulty(), CreateQuestionDifficultyInput, createQuestionDifficultyInputSchema, useCreateQuestionDifficulty(), UseCreateQuestionDifficultyOptions, deleteQuestionDifficulty(), DeleteQuestionDifficultyDTO, useDeleteQuestionDifficulty() (+3 more)

### Community 130 - "Community 130"
Cohesion: 0.14
Nodes (17): deleteQuestion(), DeleteQuestionApiDTO, questionQueryOptionsMap, useDeleteQuestion(), UseDeleteQuestionOptions, getTypeTheAnswerQuestions(), GetTypeTheAnswerQuestionsParams, getTypeTheAnswerQuestionsQueryOptions() (+9 more)

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
Cohesion: 0.30
Nodes (8): IHostEnvironment, CancellationToken, Guid, IConfiguration, ILogger, int, Task, DbSeeder

### Community 137 - "Community 137"
Cohesion: 0.27
Nodes (7): DateTime, Guid, RefreshToken, CancellationToken, Guid, Task, RefreshTokenRepository

### Community 138 - "Community 138"
Cohesion: 0.05
Nodes (46): BesimCard(), BesimCardProps, ColorCard(), ColorCardProps, TextType(), TextTypeProps, QuestionMedia(), QuestionMediaProps (+38 more)

### Community 139 - "Community 139"
Cohesion: 0.28
Nodes (8): applyFont(), FONT_OPTIONS, FONT_VARS, FontOption, FontZone, normalizeFont(), toCssValue(), Settings()

### Community 140 - "Community 140"
Cohesion: 0.16
Nodes (13): getCurrentState(), getCurrentStateQueryOptions(), useCurrentStateData(), UseCurrentStateOptions, submitAnswer(), SubmitAnswerInput, submitAnswerInputSchema, useSubmitAnswer() (+5 more)

### Community 143 - "Community 143"
Cohesion: 0.06
Nodes (30): 1. Quiz Session Flow, 2. Component Hierarchy, 3. Component Specifications, Accessibility, AnswerFeedback, API Integration, Architecture, Components and Interfaces (+22 more)

### Community 144 - "Community 144"
Cohesion: 0.22
Nodes (5): Migration, MigrationBuilder, InitialCreate, MigrationBuilder, RemoveUniversitetiDrejtimi

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (7): CancellationToken, Task, IEmailSender, CancellationToken, ILogger, Task, LoggingEmailSender

### Community 146 - "Community 146"
Cohesion: 0.18
Nodes (6): Intl, RotatingText, RotatingTextProps, RotatingTextRef, Segmenter, Segments

### Community 147 - "Community 147"
Cohesion: 0.25
Nodes (7): BackButtonProps, GoBackButton(), O2Button(), ModeToggle(), ModeToggleProps, useThemeSetting(), SocialButtons()

### Community 148 - "Community 148"
Cohesion: 0.29
Nodes (6): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState

### Community 149 - "Community 149"
Cohesion: 0.14
Nodes (16): createQuestionCategory(), CreateQuestionCategoryInput, createQuestionCategoryInputSchema, useCreateQuestionCategory(), UseCreateQuestionCategoryOptions, deleteQuestionCategory(), DeleteQuestionCategoryDTO, useDeleteQuestionCategory() (+8 more)

### Community 150 - "Community 150"
Cohesion: 0.33
Nodes (5): CancellationToken, Guid, IReadOnlyList, Task, IFileRepository

### Community 151 - "Community 151"
Cohesion: 0.19
Nodes (16): fetchMyQuestions(), getMyMultipleChoiceQuestions(), getMyMultipleChoiceQuestionsQueryOptions(), GetMyQuestionsParams, getMyQuestionsTotal(), getMyQuestionsTotalQueryOptions(), getMyTrueFalseQuestions(), getMyTrueFalseQuestionsQueryOptions() (+8 more)

### Community 152 - "Community 152"
Cohesion: 0.31
Nodes (4): DataFormat, DataFormatExtensions, List, Stream

### Community 153 - "Community 153"
Cohesion: 0.11
Nodes (18): 10. The frontend — Cloudflare Worker, 11. Secrets & configuration, 12. Request lifecycle — following one API call, 13. Where the real build differs from the original plan, 14. At-a-glance summary, 1. The big picture in one paragraph, 2. The one constraint that shaped everything, 3. The domain — `oxygenquiz.com` (+10 more)

### Community 154 - "Community 154"
Cohesion: 0.36
Nodes (7): DashboardErrorElement(), MainErrorFallback(), TODO: Send to your error monitoring service (Sentry, LogRocket, etc.), getErrorFontClass(), NotFoundContent(), NotFoundContentProps, NotFoundRoute()

### Community 155 - "Community 155"
Cohesion: 0.28
Nodes (7): BackgroundService, CancellationToken, ILogger, IServiceProvider, Task, TimeSpan, QuizSessionCleanupService

### Community 156 - "Community 156"
Cohesion: 0.12
Nodes (17): 10. Tests, 11. Operational runbook (for the test), 12. File map, 13. Not implemented (optional, from the plan), 1. How it works at a glance, 2. The feature flag, 3. Data model, 4. Code generation & hashing (+9 more)

### Community 157 - "Community 157"
Cohesion: 0.22
Nodes (7): IExceptionHandler, CancellationToken, Exception, HttpContext, ILogger, GlobalExceptionHandler, ValueTask

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
Cohesion: 0.22
Nodes (9): scripts, build, build-storybook, chromatic, dev, lint, preview, storybook (+1 more)

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
Cohesion: 0.17
Nodes (13): GeneratedInviteCodes, generateInviteCodes(), GenerateInviteCodesInput, useGenerateInviteCodes(), UseGenerateInviteCodesOptions, getInviteCodes(), getInviteCodesQueryOptions(), inviteCodesQueryKey (+5 more)

### Community 174 - "Community 174"
Cohesion: 0.33
Nodes (4): IServiceCollection, HttpContext, string, RateLimitingExtensions

### Community 176 - "Community 176"
Cohesion: 0.29
Nodes (6): eslintConfig, extends, name, private, type, version

### Community 177 - "Community 177"
Cohesion: 0.38
Nodes (6): AnimationType, hexToRgb01(), Offset, PrismaticBurst(), PrismaticBurstProps, toPx()

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
Cohesion: 0.12
Nodes (15): 1. Authorization rules, 2. API, 3. Backend implementation, 4. Frontend, 5. Tests, 6. File map, 7. Known limitations / follow-ups, Changing a User's Role (+7 more)

### Community 186 - "Community 186"
Cohesion: 0.13
Nodes (14): 1. Co-locate the file, 2. Use the CSF3 format with full typing, 3. Story the presentational component, not the data-fetching wrapper, 4. Mock complex props with a typed factory, 5. Use `render` only when a story needs more than static args, 6. Theme & providers, Canonical examples in this repo, How our setup works (+6 more)

### Community 187 - "Community 187"
Cohesion: 0.08
Nodes (13): QuizAPI.Models.Statistics.Questions, QuizAPI.Controllers.Quizzes, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService, QuizAPI.Tests.Grading, QuizAPI.ManyToManyTables, QuizAPI.Tests.Discovery, QuizAPI.Tests.TestSupport, QuizAPI.Services (+5 more)

### Community 190 - "Community 190"
Cohesion: 0.40
Nodes (4): CancellationToken, Func, IQueryable, Task

### Community 191 - "Community 191"
Cohesion: 0.14
Nodes (13): DbContext, DbSet, ApplicationDbContext, RolePermission, DateTime, Guid, UserRole, ICollection (+5 more)

### Community 198 - "Community 198"
Cohesion: 0.14
Nodes (12): Multiplayer lobby join flow, Room codes, The bug this replaced, The two URL shapes (both supported), Who performs the join, 1. Duplicate Join Logic — ✅ resolved, 2. Username Not Tied to Authentication, 3. Room Code Generation is Client-Side (+4 more)

### Community 205 - "Community 205"
Cohesion: 0.40
Nodes (4): resourceId, type, dependencies, apis1

### Community 206 - "Community 206"
Cohesion: 0.15
Nodes (12): Architecture, AWS TLS Management, Backend (`OxygenBackend/QuizAPI/appsettings.*.json`), Deployment (AWS), FastAPI Microservice (`microservice/.env`), Frontend (`.env`, `.env.production`), Local Development Commands, OxygenQuiz (+4 more)

### Community 207 - "Community 207"
Cohesion: 0.50
Nodes (3): QuizAPI.DTOs.Shared, IEnumerable, PaginatedResponse

### Community 209 - "Community 209"
Cohesion: 0.19
Nodes (10): CancellationToken, IEnumerable, IReadOnlyList, Task, IRoleRepository, CancellationToken, IEnumerable, IReadOnlyList (+2 more)

### Community 210 - "Community 210"
Cohesion: 0.22
Nodes (8): DrawerFilled(), Divider(), DividerProps, HeaderProps, HeaderComponent, HeaderComponentProps, HoverEffect(), HoverEffectProps

### Community 221 - "Community 221"
Cohesion: 0.32
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
Cohesion: 0.36
Nodes (3): TimeSpan, Fact, QuizScoringTests

### Community 269 - "TopNotification.stories.tsx"
Cohesion: 0.17
Nodes (11): icons, AutoDismiss, Error, Info, Story, Success, TitleOnly, Warning (+3 more)

### Community 270 - "ReportDtos.cs"
Cohesion: 0.23
Nodes (9): QuizAPI.Services.Reports, QuizAPI.DTOs.Reports, QuizAPI.Controllers.Reports, DateTime, List, AttemptsByDayPoint, QuizAnalyticsDto, QuizQuestionAnalyticsRow (+1 more)

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
Cohesion: 0.21
Nodes (6): Stream, Task, IImageService, ILogger, Task, ImageCleanUpService

### Community 276 - "InviteCodeRepository"
Cohesion: 0.32
Nodes (6): CancellationToken, Guid, IEnumerable, IReadOnlyList, Task, InviteCodeRepository

### Community 277 - "Implementation Plan — Invite-Code Signup Gate"
Cohesion: 0.18
Nodes (11): 10. Operational runbook, 1. Design decisions (and why), 2. Data model, 3. Repository, 4. Signup flow, 5. Code generation, 6. Disable guest play during the test (optional), 7. Frontend (+3 more)

### Community 278 - "Production Runbook — oxygenquiz.com on Hetzner"
Cohesion: 0.18
Nodes (11): Notes, Production Runbook — oxygenquiz.com on Hetzner, Step 0 — One required code change (forwarded headers), Step 1 — Cloudflare (DNS + TLS), Step 2 — Server prep (Docker + firewall), Step 3 — Copy config + secrets onto the server, Step 4 — Build the frontend and copy it up, Step 5 — Bring it up (+3 more)

### Community 279 - "Image Upload Flow (ImageAsset pipeline)"
Cohesion: 0.18
Nodes (10): 1. Upload — `POST /api/ImageUpload/question`, 2. Associate — `POST /api/ImageUpload/associate`, Cleanup job, Components, Endpoints, Image Upload Flow (ImageAsset pipeline), `ImageAsset` schema, Lifecycle (sequence) (+2 more)

### Community 280 - "Quiz Answer Submission & Grading"
Cohesion: 0.18
Nodes (11): Grading rules (`AnswerGradingService.DetermineCorrectnessAsync`), Instant feedback result (`InstantFeedbackAnswerResultDto`), Key files, Multiplayer, Quiz Answer Submission & Grading, Scoring, Submission flow (`SubmitAnswerAsync`), Submitting an answer (`UserAnswerCM`) (+3 more)

### Community 281 - "TestQuestionService"
Cohesion: 0.36
Nodes (5): ILogger, Task, TestQuestionService, List, TestQuestionRequest

### Community 282 - "IAnswerGradingService"
Cohesion: 0.31
Nodes (5): DateTime, Guid, Task, IAnswerGradingService, SessionGradingStatus

### Community 283 - "IInviteCodeGenerator"
Cohesion: 0.20
Nodes (4): IInviteCodeGenerator, int, string, InviteCodeGenerator

### Community 284 - "Generic File Storage (Files entity)"
Cohesion: 0.20
Nodes (9): Avatar change (implemented), Can both systems coexist? Yes., Endpoints (`Controllers/Files/FilesController.cs`, `[Authorize]`), `FileRecord` schema (table `Files`), Future convergence (not now), Generic File Storage (Files entity), Purpose, Required vs optional (+1 more)

### Community 285 - "Getting Started — Required Software & Setup"
Cohesion: 0.20
Nodes (10): 1. Database, 2. Backend API, 3. Frontend, First login, Getting Started — Required Software & Setup, Option A — Docker Compose (quickest), Option B — Run locally (without Docker), Optional — AI / LLM chat microservice (+2 more)

### Community 286 - "get-quiz-analytics.ts"
Cohesion: 0.27
Nodes (8): getQuizAnalytics(), getQuizAnalyticsQueryOptions(), useQuizAnalytics(), UseQuizAnalyticsOptions, AttemptsByDayPoint, QuizAnalytics, QuizQuestionAnalyticsRow, ScoreBucket

### Community 287 - "Deployment Runbook — quick commands"
Cohesion: 0.22
Nodes (9): 1. Connect to the server, 2. Check the current state of things, 3. Everyday operations, 4. Deploying a code change (desktop → GitHub → server), 5. DONE — Data Protection fix + DNS + CI fix + Origin cert (2026-07-03 → 07-04), 6. ✅ DONE (2026-07-04) — bring `api.oxygenquiz.com` online (Nginx + Origin cert), Deployment Runbook — quick commands, Key files & secrets (+1 more)

### Community 288 - "Audit Logging"
Cohesion: 0.22
Nodes (8): Adding a new audited action, Audit Logging, How to read it, How to write one, Purpose, What a row records, What NOT to audit, Where it's used today

### Community 289 - "Rate Limiting"
Cohesion: 0.22
Nodes (9): Endpoint policies, Rate Limiting, Rejection behavior, Related, Testing it, Trusting the client IP, Tuning, What's configured (+1 more)

### Community 290 - "PointSystem"
Cohesion: 0.29
Nodes (6): double, PointSystem, int, QuizScoring, InlineData, Theory

### Community 291 - ".OnModelCreating"
Cohesion: 0.25
Nodes (4): ModelBuilder, ModelBuilder, ModelBuilder, RoleSeeder

### Community 292 - "OxygenQuiz — Session Handoff"
Cohesion: 0.29
Nodes (6): Conventions we settled on, OPEN LOOSE ENDS (do these / keep in mind), OxygenQuiz — Session Handoff, Possible next steps we discussed, Project, What was built this session

### Community 293 - "NotACommonPasswordAttribute"
Cohesion: 0.29
Nodes (5): HashSet, NotACommonPasswordAttribute, ValidationAttribute, ValidationContext, ValidationResult

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
Cohesion: 0.47
Nodes (5): getIndividualQuestion(), getIndividualQuestionQueryOptions(), useIndividualQuestionData(), UseIndividualQuestionOptions, IndividualQuestion

### Community 300 - "Notifications-store.ts"
Cohesion: 0.50
Nodes (3): Notification, NotificationsStore, NotificationVariant

### Community 301 - "QuestionDifficultyDTO"
Cohesion: 0.50
Nodes (3): DateTime, QuestionDifficultyCM, QuestionDifficultyDTO

## Knowledge Gaps
- **1318 isolated node(s):** `config`, `preview`, `QuizAPI.Tests.Discovery`, `QuizAPI.Tests.Editing`, `QuizAPI.Tests.Grading` (+1313 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **269 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApplicationDbContext` connect `Community 191` to `REST Controller Base`, `Community 136`, `Community 137`, `Invite Codes API`, `Answer Grading Service`, `Audit Logs Controller`, `Backend Namespaces / Tests`, `Quiz Session Service`, `InviteCodeRepository`, `TestQuestionService`, `Question Models`, `Community 30`, `Community 159`, `Community 32`, `Community 33`, `.OnModelCreating`, `Community 43`, `Community 44`, `Community 51`, `Community 54`, `Community 187`, `Community 59`, `Community 62`, `Community 67`, `Community 78`, `Community 79`, `Community 80`, `Community 209`, `Community 84`, `Community 86`, `Community 87`, `Community 89`, `Community 93`, `Community 95`, `Community 97`, `Community 106`, `Community 107`, `Community 118`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `QuizAPI.Models` connect `Audit & Repositories` to `Community 134`, `REST Controller Base`, `Community 137`, `Invite Codes API`, `Audit Logs Controller`, `Backend Namespaces / Tests`, `Backend Service Namespaces`, `.OnModelCreating`, `Community 43`, `Community 54`, `Community 187`, `Community 61`, `Community 62`, `Community 191`, `Community 76`, `Community 80`, `Community 82`, `Community 89`, `Community 91`, `Community 97`, `Community 114`, `Community 118`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `QuizAPI.Data` connect `Audit & Repositories` to `Backend Namespaces / Tests`, `Backend Service Namespaces`, `20260612120000_RemoveUniversitetiDrejtimi.Designer.cs`, `Community 54`, `Community 187`, `Community 61`, `Community 211`, `Community 212`, `Community 213`, `Community 214`, `Community 215`, `Community 216`, `Community 217`, `Community 218`, `Community 219`, `Community 220`, `Community 91`, `Community 222`, `Community 223`, `Community 117`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `config`, `preview`, `QuizAPI.Tests.Discovery` to the rest of the system?**
  _1370 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Card & Text Components` be split into smaller, more focused modules?**
  _Cohesion score 0.052192982456140354 - nodes in this community are weakly interconnected._
- **Should `File Upload & LLM API (frontend)` be split into smaller, more focused modules?**
  _Cohesion score 0.06236786469344609 - nodes in this community are weakly interconnected._
- **Should `Form & Select UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.09177215189873418 - nodes in this community are weakly interconnected._