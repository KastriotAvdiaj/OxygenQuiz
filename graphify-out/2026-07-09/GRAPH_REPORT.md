# Graph Report - .  (2026-07-08)

## Corpus Check
- Large corpus: 926 files · ~1,497,245 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4743 nodes · 12420 edges · 269 communities (222 shown, 47 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 507 edges (avg confidence: 0.77)
- Token cost: 534,817 input · 0 output

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
- `Frontend App Shell (index.html)` --conceptually_related_to--> `React + Vite Frontend`  [INFERRED]
  index.html → README.md
- `Production Docker Compose Stack` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  deploy/docker-compose.prod.yml → docker-compose.yml
- `Dev PostgreSQL Container` --semantically_similar_to--> `Full-Stack Docker Compose`  [INFERRED] [semantically similar]
  docker-compose.dev.yml → docker-compose.yml
- `Backend (.NET) Tests Job` --references--> `ASP.NET Core QuizAPI Backend`  [INFERRED]
  .github/workflows/tests.yml → README.md

## Import Cycles
- 3-file cycle: `src/components/ui/index.ts -> src/components/ui/mode-toggle.tsx -> src/hooks/use-theme-setting.ts -> src/components/ui/index.ts`

## Hyperedges (group relationships)
- **Quiz Play Spec (Requirements + Design + Tasks)** — kiro_specs_quiz_play_requirements_quiz_interaction, kiro_specs_quiz_play_design_quiz_play_feature, kiro_specs_quiz_play_tasks_implementation_plan [EXTRACTED 0.90]
- **Rotating Refresh Token Flow** — oxygenbackend_quizapi_auth_refreshtoken_files_integration_plan_refreshtoken, oxygenbackend_quizapi_auth_refreshtoken_files_integration_plan_token_service, oxygenbackend_quizapi_auth_refreshtoken_files_integration_plan_authentication_service, oxygenbackend_quizapi_auth_refreshtoken_files_integration_plan_httponly_cookie [EXTRACTED 0.90]
- **OxygenQuiz Deployment Topology** — readme_frontend, readme_backend, readme_microservice, readme_aws_deployment [INFERRED 0.80]
- **Hashed single-use bearer token pattern** — docs_auth_authentication_refresh_token, docs_auth_email_verification_tokens_table, docs_auth_invite_code_system_invite_code_entity [EXTRACTED 0.95]
- **Multiplayer login + identity enforcement** — docs_auth_play_auth_and_identity_quiz_hub, docs_auth_play_auth_and_identity_access_token_factory, docs_auth_play_auth_and_identity_server_derived_identity, docs_auth_authentication_token_store [EXTRACTED 0.90]
- **Invite-code gated signup flow** — docs_auth_authentication_authentication_service, docs_auth_invite_code_system_repository, docs_auth_invite_code_system_generator, docs_auth_invite_code_system_require_invite_flag [EXTRACTED 0.90]
- **End-to-End TLS (two-hop) Chain** — docs_deployment_infrastructure_cloudflare, docs_deployment_infrastructure_nginx, docs_deployment_infrastructure_origin_certificate, docs_deployment_infrastructure_full_strict [EXTRACTED 1.00]
- **Single-Instance Constraint Drivers** — docs_deployment_deployment_signalr, docs_deployment_infrastructure_match_orchestrator, docs_deployment_deployment_hangfire, docs_deployment_deployment_single_instance_constraint [EXTRACTED 1.00]
- **Image Upload Lifecycle (upload-associate-cleanup)** — docs_media_image_upload_flow_image_upload_controller, docs_media_image_upload_flow_imageasset_pipeline, docs_media_image_upload_flow_image_cleanup_service [EXTRACTED 1.00]
- **Reusable Filtering Stack** — docs_quiz_filtering_filter_engine, docs_quiz_filtering_filter_field_set, docs_quiz_filtering_paged_response [EXTRACTED 1.00]
- **Copy-on-Write Version Pinning** — docs_quiz_quiz_editing_copy_on_write, docs_quiz_quiz_editing_session_pinning, docs_quiz_quiz_editing_quiz_question_versioning [EXTRACTED 1.00]
- **Multiplayer Real-time Core** — docs_quiz_multiplayer_analysis_quiz_hub, docs_quiz_multiplayer_analysis_session_manager, docs_quiz_multiplayer_analysis_quiz_client [EXTRACTED 1.00]

## Communities (269 total, 47 thin omitted)

### Community 0 - "UI Card & Text Components"
Cohesion: 0.05
Nodes (61): BesimCard(), BesimCardProps, ColorCard(), ColorCardProps, TextType(), TextTypeProps, AccordionContent, AccordionItem (+53 more)

### Community 1 - "File Upload & LLM API (frontend)"
Cohesion: 0.03
Nodes (76): FileRecord, uploadFile(), UploadFileInput, useUploadFile(), api, llmApi, llmChat(), LlmChatInput (+68 more)

### Community 2 - "Form & Select UI Primitives"
Cohesion: 0.07
Nodes (66): FormDrawer(), Label, SelectContent, SelectContentProps, SelectItem, SelectItemProps, SelectLabel, SelectScrollDownButton (+58 more)

### Community 3 - "Background & Drawer UI"
Cohesion: 0.05
Nodes (55): DrawerLinks(), DrawerFilled(), Divider(), DividerProps, HeaderProps, HeaderComponent, HeaderComponentProps, HoverEffect() (+47 more)

### Community 4 - "Button & Notification UI"
Cohesion: 0.07
Nodes (51): react, LiftedButton, LiftedButtonProps, useNotifications, ConfirmationDialog(), Form(), useFormField(), Input (+43 more)

### Community 5 - "Avatar Service (backend)"
Cohesion: 0.06
Nodes (45): BaseApiController, CancellationToken, Guid, IFormFile, Task, IAvatarService, CancellationToken, Guid (+37 more)

### Community 6 - "REST Controller Base"
Cohesion: 0.06
Nodes (42): ActionResult, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+34 more)

### Community 7 - "DataTable & Sheet UI"
Cohesion: 0.08
Nodes (60): DataTable(), LoadingWave(), PaginationControls(), SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+52 more)

### Community 8 - "Pagination & Audit-Log Queries"
Cohesion: 0.05
Nodes (67): PaginationControlsProps, cleanQueryParams(), extractPaginationFromHeaders(), QueryConfig, AuditLogsResult, getAuditLogs(), GetAuditLogsParams, getAuditLogsQueryOptions() (+59 more)

### Community 9 - "Auth & App Bootstrap (frontend)"
Cohesion: 0.05
Nodes (45): App(), adminAuthLoader(), authConfig, createAuthLoader(), getUser(), LoginInput, loginInputSchema, logout() (+37 more)

### Community 10 - "Invite Codes API"
Cohesion: 0.06
Nodes (34): QuizAPI.DTOs.Invitations, ActionResult, CancellationToken, HttpGet, HttpPost, IActionResult, IReadOnlyList, Task (+26 more)

### Community 11 - "Questions API Controller"
Cohesion: 0.11
Nodes (23): Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, Task (+15 more)

### Community 12 - "Deployment Config & Secrets (docs)"
Cohesion: 0.06
Nodes (56): Seed AdminEmail Default (admin@example.com login trap), .NET Config Layering (appsettings precedence), Configuration & Settings Guide, .env.prod Secrets File, Double-Underscore Env Var Nesting, Deployment & Go-Live Runbook (strategy), Security__EnforceProductionConfig Gate, Hangfire Background Jobs (+48 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, date-fns, framer-motion, gsap, @gsap/react, @hookform/resolvers (+45 more)

### Community 14 - "Data Import/Export"
Cohesion: 0.09
Nodes (39): DataTransferControls(), DataTransferControlsProps, exportData(), ExportFormat, EXTENSION, importData(), ImportResult, TransferEntity (+31 more)

### Community 15 - "Answer Grading Service"
Cohesion: 0.09
Nodes (26): DateTime, Guid, Task, IAnswerGradingService, SessionGradingStatus, Task, ISubmitAnswerService, Guid (+18 more)

### Community 16 - "Question Versioning & Scoring"
Cohesion: 0.10
Nodes (17): DiffResult, double, IEnumerable, IReadOnlyCollection, QuizQuestionVersioning, QuizQuestionUM, PointSystem, int (+9 more)

### Community 17 - "Audit Logs Controller"
Cohesion: 0.07
Nodes (32): CancellationToken, HttpGet, IActionResult, Task, AuditLogsController, DateTime, Guid, AuditLogDTO (+24 more)

### Community 18 - "Question Service & Image Assoc."
Cohesion: 0.13
Nodes (17): CancellationToken, Expression, Func, Guid, IQueryable, List, Task, QuestionService (+9 more)

### Community 19 - "Backend Namespaces / Tests"
Cohesion: 0.09
Nodes (16): QuizAPI.Tests.Editing, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.UserAnswerService, QuizAPI.Common, QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService, QuizAPI.Controllers, QuizAPI.Tests.Grading, QuizAPI.ManyToManyTables, QuizAPI.DTOs.Quiz (+8 more)

### Community 20 - "Quiz Session Service"
Cohesion: 0.13
Nodes (18): Guid, ILogger, List, Task, QuizSessionService, DateTime, Guid, TimeSpan (+10 more)

### Community 21 - "Build Tooling / Dev Deps"
Cohesion: 0.05
Nodes (44): devDependencies, autoprefixer, baseline-browser-mapping, @chromatic-com/storybook, cross-env, esbuild, eslint, @eslint/js (+36 more)

### Community 22 - "Filtering & Pagination Framework"
Cohesion: 0.05
Nodes (41): FilterEngine, FilterFieldSet Whitelist, FilterQuery, Filtering, Sorting & Pagination Framework, Frontend filter-builder (src/lib/filtering), PagedResponse Body Envelope, restrictToUserId Ownership Clamp, Filter Safety Model (+33 more)

### Community 23 - "Auth Controller & Rate Limiting"
Cohesion: 0.12
Nodes (20): AllowAnonymous, Authorize, CancellationToken, DateTime, EnableRateLimiting, HttpGet, HttpPost, IActionResult (+12 more)

### Community 24 - "User Service"
Cohesion: 0.14
Nodes (15): CancellationToken, Guid, HashSet, IEnumerable, IQueryable, IReadOnlyList, Task, UserService (+7 more)

### Community 25 - "Question Models"
Cohesion: 0.13
Nodes (18): QuizAPI.Models.Statistics.Questions, DateTime, Guid, ICollection, List, MultipleChoiceQuestion, QuestionBase, QuestionMediaType (+10 more)

### Community 26 - "Audit & Repositories"
Cohesion: 0.12
Nodes (9): QuizAPI.DTOs.Audit, QuizAPI.Repositories, QuizAPI.Tests.Users, QuizAPI.Data, QuizAPI.Models, QuizAPI.Controllers.Audit, QuizAPI.Repositories.Interfaces, QuizAPI.Controllers.Roles (+1 more)

### Community 27 - "Filter UI Components"
Cohesion: 0.12
Nodes (26): ActiveFilterPill, ActiveFilterPills(), ActiveFilterPillsProps, DateRangeFilter(), DateRangeFilterProps, MultiSelect(), MultiSelectOption, MultiSelectProps (+18 more)

### Community 28 - "Backend Service Namespaces"
Cohesion: 0.12
Nodes (16): QuizAPI.Controllers.Quizzes.Services.QuizServices, QuizAPI.Filtering, QuizAPI.Controllers.Questions.Services, QuizAPI.Controllers.Image.Services, QuizAPI.Controllers.DataTransfer, QuizAPI.Services.Interfaces, QuizAPI.Mapping, QuizAPI.Services.Audit (+8 more)

### Community 29 - "Reports Service & Controller"
Cohesion: 0.11
Nodes (23): QuizAPI.Services.Reports, QuizAPI.DTOs.Reports, QuizAPI.Controllers.Reports, CancellationToken, HttpGet, HttpPost, IActionResult, List (+15 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (12): FileContentResult, Authorize, CancellationToken, HttpGet, HttpPost, IActionResult, IFormFile, List (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (17): CancellationToken, Guid, List, Task, IQuizService, DateTime, ICollection, QuizCM (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (17): DateTime, Guid, ICollection, QuestionCategory, QuestionDifficulty, QuestionLanguage, User, Quiz (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (23): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+15 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (24): RFC-7807, MultiplayerContext, MultiplayerContextType, MultiplayerProvider(), AppNotification, invalidateAll(), notificationKeys, notificationsQueryOptions() (+16 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (7): List, IResult, Result, Guid, List, Task, IQuizSessionService

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (20): List, DateTime, IReadOnlyList, MatchResult, PlayerRoundResult, QuestionResult, RoundAnswer, RoundOption (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (25): borderColors, icons, Notification(), NotificationProps, Error, Info, meta, Story (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (23): QuestionMedia(), QuestionMediaProps, MultiplayerQuestionView(), toCurrentQuestion(), FeedbackDisplay(), FeedbackDisplayProps, QuestionCard(), QuestionCardProps (+15 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (26): apiService, getQuizAnalytics(), getQuizAnalyticsQueryOptions(), useQuizAnalytics(), UseQuizAnalyticsOptions, getQuiz(), getQuizQueryOptions(), getQuizQuestions() (+18 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (22): BulkSettingsPanel(), SmallBaseQuestionCard(), SmallQuestionFooter(), SmallQuestionHeader(), ExistingSmallQuestionCardProps, NewSmallQuestionCardProps, SmallQuestionCardProps, ExistingSmallMultipleChoiceCard() (+14 more)

### Community 41 - "Community 41"
Cohesion: 0.23
Nodes (14): AllowAnonymous, Authorize, CancellationToken, Guid, HttpDelete, HttpGet, HttpPatch, HttpPost (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (23): EmailVerificationBanner(), usersLoader(), createUser(), CreateUserInput, createUserInputSchema, useCreateUser(), UseCreateUserOptions, deleteUser() (+15 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (19): QuizAPI.DTOs.Settings, QuizAPI.Services.SettingsService, QuizAPI.Controllers.Settings, CancellationToken, HttpGet, HttpPut, IActionResult, Task (+11 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (13): AuthResponseDTO, DateTime, AuthResult, CancellationToken, Guid, Task, IRefreshTokenRepository, CancellationToken (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (29): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_URLS (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (24): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+16 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (8): Exception, Guid, IServiceProvider, Task, QuizHub, IReadOnlyList, Task, IQuizSessionManager

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (23): getIndividualQuestion(), getIndividualQuestionQueryOptions(), useIndividualQuestionData(), UseIndividualQuestionOptions, TrueFalseQuestionCardProps, TrueFalseQuestionListProps, UpdateTrueFalseQuestionFormProps, TrueFalseAnswersProps (+15 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (18): QuizAPI.Controllers.Image, IImageFormat, HttpPost, IActionResult, IFormFile, ILogger, int, IWebHostEnvironment (+10 more)

### Community 50 - "Community 50"
Cohesion: 0.30
Nodes (11): IActionResult, BaseApiController, Authorize, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (7): Fact, IConfiguration, InlineData, Mock, Task, Theory, AuthenticationServiceTests

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (20): DataTableProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+12 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (15): ActiveFilterPills(), ActiveFilterPillsProps, FilterAction, FilterState, initialFilterState, FilterPanel(), FilterPresets(), FilterPresetsProps (+7 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (14): QuizAPI.Controllers.Totals, QuizAPI.Services, ActionResult, HttpGet, TotalsController, ModelBuilder, DashboardService, Guid (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (25): ChatApp.Models, ChatApp.DTOs, ChatMemberPresenceDto, ChatRoomDto, ChatRoomMemberDto, ChatUserRef, CreateChatRoomRequest, JoinRoomRequest (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (10): QuizAPI.Chat_System.Services, ConnectionService, ConcurrentDictionary, Guid, IEnumerable, Task, Guid, IEnumerable (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (18): Alert, AlertDescription, AlertTitle, alertVariants, Checkbox, Progress, RadioGroup, RadioGroupItem (+10 more)

### Community 58 - "Community 58"
Cohesion: 0.11
Nodes (23): CreateQuestionInput, createTrueFalseQuestion(), createTrueFalseQuestionInputSchema, UseCreateTrueFalseQuestionOptions, createTypeTheAnswerQuestion(), CreateTypeTheAnswerQuestionInput, createTypeTheAnswerQuestionInputSchema, transformFormData() (+15 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (14): AutomaticRetry, IBackgroundJobClient, IsCorrect, DateTime, Guid, HashSet, ILogger, IServiceScopeFactory (+6 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (13): CancellationTokenSource, ConcurrentDictionary, int, IReadOnlyList, List, Task, InMemoryQuizSessionManager, ConcurrentDictionary (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (14): QuizAPI.Services.AuthenticationService, QuizAPI.Services.Invitations, QuizAPI.Tests.Auth, QuizAPI.Middleware, QuizAPI.Controllers.Authentication, QuizAPI.DTOs.Authentication, QuizAPI.Services.Email, QuizAPI.Tests.TestSupport (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (17): ActionResult, Authorize, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult, IEnumerable (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (9): List, CancellationToken, Guid, IDbContextTransaction, IEnumerable, IReadOnlyCollection, List, Task (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (17): StepsProps, AvailabilityResponse, fetchAvailability(), fetchInviteValidity(), InviteCodeValidityResponse, normalizeInviteCode(), useEmailAvailability(), useInviteCodeValidity() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.20
Nodes (8): CancellationToken, ErrorMessage, Guid, IsCustomMessage, List, Success, Task, IQuestionService

### Community 66 - "Community 66"
Cohesion: 0.21
Nodes (8): ErrorMessage, IsCustomMessage, Success, TrueFalseQuestion, CancellationToken, Guid, Task, IQuestionRepository

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (11): DateTime, Guid, ICollection, User, CancellationToken, Guid, IEnumerable, IQueryable (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (16): DrawerHeaderContent(), ProfileButton, ProfileButtonProps, Avatar, AvatarFallback, AvatarImage, ALLOWED_AVATAR_ACCEPT, ALLOWED_AVATAR_TYPES (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (14): InputField(), InputFieldProps, Error(), ErrorProps, FieldWrapper(), FieldWrapperPassThroughProps, FieldWrapperProps, InputProps (+6 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (19): useGuestQuizSession(), UseGuestQuizSessionParams, createGuestQuizSession(), finishGuestSession(), getGuestCanPlay(), getGuestNextQuestion(), getGuestSessionResults(), submitGuestAnswer() (+11 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (17): getErrorAwareStyles(), ImageHandlerProps, useFormValidation(), ValidationError, ValidationErrorsDisplay(), ValidationErrorsDisplayProps, QuestionTabContentProps, DeleteUserProps (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.11
Nodes (20): createMultipleChoiceQuestion(), CreateMultipleChoiceQuestionInput, createMultipleChoiceQuestionInputSchema, UseCreateMultipleChoiceQuestionOptions, updateMultipleChoiceQuestion(), UpdateMultipleChoiceQuestionInput, updateMultipleChoiceQuestionInputSchema, useUpdateMultipleChoiceQuestion() (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.12
Nodes (20): CreateQuizInput, MultipleChoiceFormCardProps, TrueFalseFormCardProps, TypeTheAnswerFormCardProps, NewMultipleChoiceOptionsProps, NewTrueFalseOptions(), NewTrueFalseOptionsProps, NewSmallTypeAnswerDisplay() (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (15): ControllerBase, Task, ITestQuestionService, ILogger, Task, TestQuestionService, ActionResult, HttpPost (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.09
Nodes (23): Legacy ImageUrl Back-Compat, Question Media (images, audio, video), FileRecord / FileService, ImageAsset / ImageService (legacy), QuestionMediaType Enum, QuestionMedia Component, Copy-on-Write QuizQuestion Versioning, Session Version Pinning (+15 more)

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (8): CancellationToken, Guid, ILogger, IQueryable, Task, QuizService, QuizFilterParams, IQueryable

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (22): BCrypt.Net-Next (4.0.3), Bogus (35.6.1), ClosedXML (0.105.0), CsvHelper (33.0.1), Hangfire.AspNetCore (1.8.21), Hangfire.PostgreSql (1.20.13), Microsoft.AspNetCore.Authentication.JwtBearer (8.0.20), Microsoft.AspNetCore.SignalR (1.2.0) (+14 more)

### Community 78 - "Community 78"
Cohesion: 0.34
Nodes (6): Fact, InlineData, List, Task, Theory, AnswerGradingServiceTests

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
Cohesion: 0.20
Nodes (16): DateTime, Guid, List, AnswerOptionDTO, AnswerOptionForQuizPlaying, AnswerOptionUM, IndividualQuestionDTO, MultipleChoiceQuestionCM (+8 more)

### Community 83 - "Community 83"
Cohesion: 0.11
Nodes (20): contentVersion, metadata, _dependencyType, description, _parameterType, parameters, resourceGroupLocation, resourceGroupName (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.38
Nodes (7): Fact, Guid, int, IReadOnlyList, Mock, Task, UserServiceRoleTests

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (12): QuizAPI.Services.QuizSessionServices, QuizAPI.MongoDB.Models, IMongoCollection, DateTime, LobbyChatLog, ILogger, string, ILobbyChatArchiver (+4 more)

### Community 86 - "Community 86"
Cohesion: 0.17
Nodes (14): QuizAPI.DTOs.Permission, ActionResult, CancellationToken, HttpDelete, HttpGet, HttpPost, IActionResult, string (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (12): End, From, ReportCriteria, CancellationToken, DateTime, Guid, IEnumerable, List (+4 more)

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
Cohesion: 0.15
Nodes (11): QuizAPI.DTOs.Notification, QuizAPI.Hubs, QuizAPI.Controllers.Files.Services, QuizAPI.Hubs.Clients, QuizAPI.Controllers.Notifications.Services, QuizAPI.Controllers.Notifications, QuizAPI.Controllers.Users.Services, QuizAPI.Exceptions (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.13
Nodes (17): QuizAPI.DTOs.DataTransfer, DateTime, Guid, List, CategoryExportRow, CategoryImportRow, DifficultyExportRow, DifficultyImportRow (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.12
Nodes (13): DbContext, DbSet, ILogger, IWebHostEnvironment, Stream, Task, ImageService, ApplicationDbContext (+5 more)

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (11): Dictionary, CategoryFilterFields, QuestionFilterFields, UserFilterFields, IQueryable, LambdaExpression, HashSet, IEnumerable (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (10): IMemoryCache, CancellationToken, Guid, HashSet, IQueryable, string, Task, TimeSpan (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.17
Nodes (11): CancellationToken, Guid, HashSet, IFormFile, ILogger, IReadOnlyList, IWebHostEnvironment, long (+3 more)

### Community 97 - "Community 97"
Cohesion: 0.19
Nodes (10): IEnumerable, List, Task, AnswerOptionService, IEnumerable, List, Task, IAnswerOptionService (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.19
Nodes (16): extractErrorMessage(), handleQuestionFetchError(), isActiveSessionError(), useQuizSession(), UseQuizSessionParams, createQuizSession(), CreateQuizSessionInput, createQuizSessionInputSchema (+8 more)

### Community 99 - "Community 99"
Cohesion: 0.15
Nodes (13): DashboardLayout(), DashboardLayoutProps, AppRootProps, DashboardHeader(), DashboardNav(), adminDashboardNavButtons, DashboardNavItem, userDashboardNavButtons (+5 more)

### Community 100 - "Community 100"
Cohesion: 0.29
Nodes (11): BaseQuestionCard(), BaseQuestionCardProps, ExistingQuestionCardProps, MultipleChoiceCard(), QuestionFooter(), QuestionImagePreview(), QuestionImagePreviewProps, QuestionMetadata() (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.16
Nodes (13): QuizAPI.Controllers.Files, ActionResult, CancellationToken, Guid, HttpDelete, HttpGet, HttpPost, IActionResult (+5 more)

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (9): EnableRateLimiting, Guid, HttpGet, HttpPost, IActionResult, ProducesResponseType, string, Task (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.13
Nodes (12): MultiplayerQuestionViewProps, MultiplayerGame(), MultiplayerGameProps, MatchPhase, MatchResult, PlayerRoundResult, QuestionResult, RoundOption (+4 more)

### Community 104 - "Community 104"
Cohesion: 0.12
Nodes (16): aliases, components, utils, iconLibrary, registries, @react-bits, rsc, $schema (+8 more)

### Community 105 - "Community 105"
Cohesion: 0.21
Nodes (10): ConstantExpression, ExpressionVisitor, MethodInfo, Expression, Func, IReadOnlyList, Type, FilterEngine (+2 more)

### Community 106 - "Community 106"
Cohesion: 0.21
Nodes (11): ActionResult, Authorize, CancellationToken, HttpDelete, HttpGet, HttpPost, HttpPut, IActionResult (+3 more)

### Community 107 - "Community 107"
Cohesion: 0.15
Nodes (12): DateTime, List, QuestionCategoryCM, QuestionCategoryDTO, DateTime, QuestionLanguageCM, QuestionLanguageDTO, SecondaryMappers (+4 more)

### Community 108 - "Community 108"
Cohesion: 0.14
Nodes (12): QuestionDisplay(), QuizInterface(), QuizInterfaceProps, AnsweredCorrectly, FinalQuestionComplete, FreshQuestion, LoadingNextQuestion, sampleQuestion (+4 more)

### Community 109 - "Community 109"
Cohesion: 0.19
Nodes (8): IOrderedQueryable, IQueryable, string, QuizVarietyOrdering, Fact, InlineData, Theory, QuizVarietyOrderingTests

### Community 110 - "Community 110"
Cohesion: 0.16
Nodes (14): QuestionFooterProps, QuestionMetadataProps, CategoryBadge, CommonSelectQuestionCard, DifficultyBadge, ImageBadge, LanguageBadge, MultipleChoiceBadges (+6 more)

### Community 111 - "Community 111"
Cohesion: 0.12
Nodes (13): Countdown, Match, mcQuestion, QuestionAnswered, QuestionMultipleChoice, QuestionTrueFalse, ResultsOpponentWins, ResultsYouWin (+5 more)

### Community 112 - "Community 112"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 113 - "Community 113"
Cohesion: 0.20
Nodes (10): QuizAPI.DTOs.Files, CancellationToken, Guid, IFormFile, IReadOnlyList, Task, IFileService, DateTime (+2 more)

### Community 114 - "Community 114"
Cohesion: 0.19
Nodes (7): List, UserAnswerDto, Expression, Func, IEnumerable, List, QuizSessionMappers

### Community 115 - "Community 115"
Cohesion: 0.34
Nodes (10): useThemeSetting(), getSettings(), getSettingsQueryOptions(), useSettingsData(), updateSettings(), useUpdateSettings(), UseUpdateSettingsOptions, Settings() (+2 more)

### Community 116 - "Community 116"
Cohesion: 0.22
Nodes (6): QuizAPI.Services.DataTransfer, IEnumerable, JsonSerializerOptions, DataExportService, ExportFile, IDataExportService

### Community 117 - "Community 117"
Cohesion: 0.14
Nodes (8): QuizAPI.Migrations, ModelSnapshot, ModelBuilder, AddUserSettings, ModelBuilder, RemoveUniversitetiDrejtimi, ModelBuilder, ApplicationDbContextModelSnapshot

### Community 118 - "Community 118"
Cohesion: 0.24
Nodes (8): DateTime, Guid, FileRecord, CancellationToken, Guid, IReadOnlyList, Task, FileRepository

### Community 119 - "Community 119"
Cohesion: 0.24
Nodes (8): DateTime, expiresAt, IConfiguration, int, IReadOnlyCollection, rawToken, tokenHash, TokenService

### Community 120 - "Community 120"
Cohesion: 0.23
Nodes (12): UseQuizSessionReturn, QuestionReview(), QuestionReviewProps, QuizOverview(), QuizOverviewProps, QuizResultsProps, calculateQuizStats(), formatDuration() (+4 more)

### Community 121 - "Community 121"
Cohesion: 0.24
Nodes (11): getPermissionMatrix(), getPermissionMatrixQueryOptions(), permissionMatrixQueryKey, usePermissionMatrix(), updateRolePermission(), UpdateRolePermissionInput, useUpdateRolePermission(), UseUpdateRolePermissionOptions (+3 more)

### Community 122 - "Community 122"
Cohesion: 0.20
Nodes (12): getGradingStatus(), getQuizSession(), getSessionResults(), useGetGradingStatus(), UseGetGradingStatusOptions, useGetQuizSession(), UseGetQuizSessionOptions, useGetSessionResults() (+4 more)

### Community 123 - "Community 123"
Cohesion: 0.20
Nodes (10): AppearanceSection(), AppearanceSectionProps, AudioSection(), AudioSectionProps, Row(), RowProps, Section(), SectionProps (+2 more)

### Community 124 - "Community 124"
Cohesion: 0.22
Nodes (10): CancellationToken, Guid, HashSet, IFormFile, IHttpContextAccessor, ILogger, long, string (+2 more)

### Community 125 - "Community 125"
Cohesion: 0.26
Nodes (6): JsonSerializerOptions, List, Stream, Type, DataImportService, IDataImportService

### Community 126 - "Community 126"
Cohesion: 0.22
Nodes (10): CanvasStrokeStyle, GridOffset, Squares(), SquaresProps, Lightning(), LightningProps, useTheme(), EffectType (+2 more)

### Community 127 - "Community 127"
Cohesion: 0.15
Nodes (11): LoadingWaveProps, sizes, AllSizes, CustomText, Default, Fast, Muted, Quiz (+3 more)

### Community 128 - "Community 128"
Cohesion: 0.22
Nodes (10): useMultiplayer(), CreateLobby(), QuizSelectionDialogProps, SelectedQuizDisplay(), SelectedQuizDisplayProps, SelectedQuiz, useLobbyConnection(), UseLobbyConnectionOptions (+2 more)

### Community 129 - "Community 129"
Cohesion: 0.21
Nodes (11): createQuestionDifficulty(), CreateQuestionDifficultyInput, createQuestionDifficultyInputSchema, useCreateQuestionDifficulty(), UseCreateQuestionDifficultyOptions, deleteQuestionDifficulty(), DeleteQuestionDifficultyDTO, useDeleteQuestionDifficulty() (+3 more)

### Community 130 - "Community 130"
Cohesion: 0.19
Nodes (8): LeaveLobbyDialog(), LobbyHeader(), LobbyInfoBanner(), LobbyInfoBannerProps, LobbyInfoBar(), LobbyInfoBarProps, MultiplayerLobbyPage(), MultiplayerLobbyPageProps

### Community 131 - "Community 131"
Cohesion: 0.24
Nodes (9): LobbyActions(), LobbyActionsProps, ParticipantCard(), ParticipantCardProps, ParticipantGrid(), ParticipantGridProps, Participant, AVATAR_COLORS (+1 more)

### Community 132 - "Community 132"
Cohesion: 0.19
Nodes (7): QuizProgressProps, AbandonmentReason, AnswerOption, AnswerStatus, LiveQuizStatus, QuizSessionSummary, ResumeResult

### Community 133 - "Community 133"
Cohesion: 0.26
Nodes (10): BaseModel, chat(), ChatRequest, ChatResponse, ErrorResponse, generate_content(), health_check(), Health check endpoint (+2 more)

### Community 134 - "Community 134"
Cohesion: 0.18
Nodes (7): QuizAPI.DTOs.User, DateTime, Guid, FullUserDTO, UserBasicDTO, Guid, ChatUserProjection

### Community 135 - "Community 135"
Cohesion: 0.23
Nodes (12): Caddy Reverse Proxy (TLS + SPA), Invite-Code Gated Signup, Production Docker Compose Stack, MongoDB Removal (Ephemeral Chat), Dev PostgreSQL Container, Full-Stack Docker Compose, Backend (.NET) Tests Job, CI Deploy Gate (+4 more)

### Community 136 - "Community 136"
Cohesion: 0.30
Nodes (8): IHostEnvironment, CancellationToken, Guid, IConfiguration, ILogger, int, Task, DbSeeder

### Community 137 - "Community 137"
Cohesion: 0.27
Nodes (7): DateTime, Guid, RefreshToken, CancellationToken, Guid, Task, RefreshTokenRepository

### Community 138 - "Community 138"
Cohesion: 0.17
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 139 - "Community 139"
Cohesion: 0.24
Nodes (9): applyFont(), FONT_OPTIONS, FONT_VARS, FontOption, FontZone, normalizeFont(), toCssValue(), TypographySection() (+1 more)

### Community 140 - "Community 140"
Cohesion: 0.24
Nodes (10): getCurrentState(), getCurrentStateQueryOptions(), useCurrentStateData(), UseCurrentStateOptions, submitAnswer(), SubmitAnswerInput, submitAnswerInputSchema, useSubmitAnswer() (+2 more)

### Community 141 - "Community 141"
Cohesion: 0.24
Nodes (11): Database access guide (psql/mongosh), oxygen-postgres dev container, MongoDB disabled (ephemeral chat), AI Microservice (Python/FastAPI + Ollama), Auto migration + seeding on startup, Backend API (ASP.NET Core .NET 8), Docker Compose setup, Frontend (React 18 + Vite 5) (+3 more)

### Community 142 - "Community 142"
Cohesion: 0.27
Nodes (11): Chromatic (visual regression), Storybook Guide, Prop-Driven Component Storyability, Storybook (component workbench), CI Deploy Gate (tests.yml), Testing Guide, EF Core InMemory (throwaway DB), Moq (mocking) (+3 more)

### Community 143 - "Community 143"
Cohesion: 0.18
Nodes (11): AnswerFeedback Component, AnswerStatus Enum, Quiz Play Component Hierarchy, Timer Infinite Loop Issue, QuestionType (MultipleChoice/TrueOrFalse/TypeTheAnswer), QuestionDisplay Component, QuizSession Model, QuizSessionMappingProfile (+3 more)

### Community 144 - "Community 144"
Cohesion: 0.22
Nodes (5): Migration, MigrationBuilder, InitialCreate, MigrationBuilder, QuizEditingVersioning

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (7): CancellationToken, Task, IEmailSender, CancellationToken, ILogger, Task, LoggingEmailSender

### Community 146 - "Community 146"
Cohesion: 0.18
Nodes (6): Intl, RotatingText, RotatingTextProps, RotatingTextRef, Segmenter, Segments

### Community 147 - "Community 147"
Cohesion: 0.33
Nodes (4): BackButtonProps, GoBackButton(), O2Button(), SocialButtons()

### Community 148 - "Community 148"
Cohesion: 0.22
Nodes (8): SettingsApplier(), initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, AppProviderProps

### Community 149 - "Community 149"
Cohesion: 0.22
Nodes (6): List, Expression, Func, IReadOnlyList, FilterOperator, FilterRule

### Community 150 - "Community 150"
Cohesion: 0.33
Nodes (5): CancellationToken, Guid, IReadOnlyList, Task, IFileRepository

### Community 151 - "Community 151"
Cohesion: 0.29
Nodes (6): DateTime, expiresAt, IReadOnlyCollection, rawToken, tokenHash, ITokenService

### Community 152 - "Community 152"
Cohesion: 0.31
Nodes (4): DataFormat, DataFormatExtensions, List, Stream

### Community 153 - "Community 153"
Cohesion: 0.24
Nodes (8): TypeTheAnswerQuestionListProps, TypeTheAnswerQuestionCardProps, UpdateTypeAnswerQuestionFormProps, TypeTheAnswerDisplay(), TypeTheAnswerDisplayProps, SmallTypeAnswerDisplay(), SmallTypeAnswerDisplayProps, TypeTheAnswerQuestion

### Community 154 - "Community 154"
Cohesion: 0.44
Nodes (6): DashboardErrorElement(), MainErrorFallback(), TODO: Send to your error monitoring service (Sentry, LogRocket, etc.), getErrorFontClass(), NotFoundContent(), NotFoundRoute()

### Community 155 - "Community 155"
Cohesion: 0.28
Nodes (7): BackgroundService, CancellationToken, ILogger, IServiceProvider, Task, TimeSpan, QuizSessionCleanupService

### Community 156 - "Community 156"
Cohesion: 0.25
Nodes (9): AuthenticationService, RefreshTokenRepository, TokenService, InviteCodesController (admin endpoints), Invite Codes admin page (frontend), InviteCodeGenerator (CSPRNG, hash), Atomic redemption (ExecuteUpdateAsync), InviteCodeRepository (TryConsumeAsync) (+1 more)

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
Cohesion: 0.25
Nodes (4): QuizAPI.Controllers.Questions.TestQuestions.Services, QuizAPI.Controllers.Questions.TestQuestions, QuizAPI.Tests.Scoring, QuizAPI.Services.Scoring

### Community 165 - "Community 165"
Cohesion: 0.32
Nodes (8): Access token (JWT HS256), change-user-role.tsx dialog, SuperAdmin privilege-escalation gate, Changing a user's role, ForbiddenException (403 mapping), Last-SuperAdmin lockout guard, IUserService.SetUserRolesAsync, Granular permissions model (resource:action)

### Community 166 - "Community 166"
Cohesion: 0.25
Nodes (8): Api-client.ts (auth interceptor), Silent refresh on 401, Refresh token rotation / sliding session, In-memory access-token store (token-store.ts), accessTokenFactory (JWT to hub), multiplayer-context.tsx (connection), QuizHub (SignalR, [Authorize]), Server-derived username from Context.User

### Community 167 - "Community 167"
Cohesion: 0.43
Nodes (7): Exception, AppException, AppValidationException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException

### Community 168 - "Community 168"
Cohesion: 0.29
Nodes (8): Auth/RefreshToken/Files Integration Plan, AuthenticationService, FileService, FileRecord Entity, HttpOnly Refresh Token Cookie, ImageService/ImageAsset Pattern, RefreshToken Entity, TokenService

### Community 169 - "Community 169"
Cohesion: 0.46
Nodes (6): decode(), encode(), hash(), omit(), requireAdmin(), sanitizeUser()

### Community 170 - "Community 170"
Cohesion: 0.43
Nodes (7): AuthorizationProps, canActOnResource(), hasPermission(), hasRole(), isSuperAdmin(), OwnedResource, useAuthorization()

### Community 171 - "Community 171"
Cohesion: 0.29
Nodes (7): testQuestion(), TestQuestionInput, testQuestionInputSchema, TestQuestionResponse, useTestQuestion(), UseTestQuestionOptions, TestQuestionDisplay()

### Community 172 - "Community 172"
Cohesion: 0.46
Nodes (6): QuizCard(), QuizCardProps, secondsToMinutes(), QuizStartModal(), QuizStartModalProps, QuizSummaryDTO

### Community 173 - "Community 173"
Cohesion: 0.33
Nodes (7): EmailVerificationTokens table, InviteCode entity (InviteCodes table), Store code hash not plaintext, Invite-Code Signup Gate — design plan, Signup:RequireInviteCode feature flag, Invite-Code Signup Gate (as built), IAuditService / AuditActions

### Community 174 - "Community 174"
Cohesion: 0.33
Nodes (4): IServiceCollection, HttpContext, string, RateLimitingExtensions

### Community 175 - "Community 175"
Cohesion: 0.33
Nodes (7): Quiz Session API Endpoints, Quiz Play Feature, Requirement 4: Accessibility and Responsiveness, Requirement 2: Progress Tracking, Requirement 1: Quiz Interaction, Requirement 3: Results and Feedback, Quiz Play Implementation Plan

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
Cohesion: 0.48
Nodes (5): getPublicProfile(), getPublicProfileQueryOptions(), usePublicProfile(), UserProfile(), PublicUserProfile

### Community 180 - "Community 180"
Cohesion: 0.33
Nodes (6): Auth.tsx (route loaders/gates), userAuthLoader / createAuthLoader, Open security gaps (public user reads), Session Handoff, Two dashboards (admin / user), UserSettings entity + SettingsApplier

### Community 181 - "Community 181"
Cohesion: 0.33
Nodes (6): Refresh-token reuse detection (planned), Refresh token (hashed, rotated), Two-token authentication scheme, GuestQuizSessionsController, IsGuestSessionAsync security check, QuizPageRouteWrapper (three-way branch)

### Community 182 - "Community 182"
Cohesion: 0.33
Nodes (6): Guest play (one free singleplayer quiz), GuestAccount (shared placeholder account), guest_played cookie (soft limit), QuizSessionService (reused engine), InMemoryQuizSessionManager (RecentMessages), LobbyChatArchiver (write-only sink)

### Community 183 - "Community 183"
Cohesion: 0.33
Nodes (6): Abstract blue and purple fluid-gradient wallpaper used as a light-theme app background, Photograph of Earth seen from orbit with a docked spacecraft module, used as an app background, Photograph of a large Moreton Bay fig tree with sprawling roots backlit by a sunburst, used as an app background, Abstract dark navy and purple fluid-gradient wallpaper used as a dark-theme app background, Stylized grayscale vector illustration of a large tree with exposed roots against a gradient sky, decorative scenery graphic, Unsplash photograph of the Very Large Telescope observatory buildings at dusk, used as a scenic app background

### Community 184 - "Community 184"
Cohesion: 0.33
Nodes (6): Portrait of the quiz-show host, a smiling man in a dark suit and tartan tie, cut out on a black background, Portrait of the same quiz-show host in a dark suit and plaid tie, cut out on a white background, Cartoon illustration of the quiz-show host in a suit standing before a game-show set with contestant podiums, a question-mark screen and an audience, History category thumbnail: photo of the Oxygen TV quiz studio with four numbered contestant podiums and the host at center, Photograph of the Oxygen TV quiz studio set with numbered podiums, circular OXYGEN floor logo and stage lighting, Aerial photograph of the Oxygen TV studio showing the host interviewing a guest in the center circle with a live audience and band

### Community 185 - "Community 185"
Cohesion: 0.33
Nodes (4): dashboardEndpoints, DashboardFetcherConfig, DashboardResource, RoleAwareEndpointMap

### Community 186 - "Community 186"
Cohesion: 0.47
Nodes (4): LobbyChat(), LobbyChatProps, LobbyChatMessage, useLobbyChat()

### Community 187 - "Community 187"
Cohesion: 0.40
Nodes (3): QuizAPI.Controllers.Quizzes, QuizAPI.Tests.Discovery, QuizFilterFields

### Community 188 - "Community 188"
Cohesion: 0.40
Nodes (5): User.EmailConfirmed flag, Email verification (double opt-in), IEmailSender abstraction, Soft gate (banner + resend), Login required to play + account identity

### Community 189 - "Community 189"
Cohesion: 0.40
Nodes (5): Api-client.ts (Axios Instance), authRequestInterceptor, Auth.tsx (Authentication Logic), Many-to-Many Roles + ProblemDetails Contract, Refresh-on-401 Axios Interceptor

### Community 190 - "Community 190"
Cohesion: 0.40
Nodes (4): CancellationToken, Func, IQueryable, Task

### Community 191 - "Community 191"
Cohesion: 0.40
Nodes (3): RolePermission, ICollection, Permission

### Community 205 - "Community 205"
Cohesion: 0.40
Nodes (4): resourceId, type, dependencies, apis1

### Community 206 - "Community 206"
Cohesion: 0.50
Nodes (4): Graphify Knowledge Graph, AWS Fargate/ECS Deployment, FastAPI LLM Microservice, OxygenQuiz Platform

### Community 207 - "Community 207"
Cohesion: 0.50
Nodes (3): QuizAPI.DTOs.Shared, IEnumerable, PaginatedResponse

### Community 208 - "Community 208"
Cohesion: 0.50
Nodes (4): AuditActions constants, AuditLog (append-only entity), IAuditService.LogAsync, Audit Logging Guide

### Community 210 - "Community 210"
Cohesion: 0.50
Nodes (3): DateTime, Guid, UserRole

### Community 224 - "Community 224"
Cohesion: 0.50
Nodes (3): type, dependencies, apis1

### Community 227 - "Community 227"
Cohesion: 0.67
Nodes (3): Idempotent import (skip duplicates), Import templates, Quiz Status (Draft/Unlisted/Public)

### Community 228 - "Community 228"
Cohesion: 0.67
Nodes (3): Optimistic Concurrency (409), QuizQuestionVersioning.Diff, QuizService.UpdateQuizAsync

### Community 229 - "Community 229"
Cohesion: 0.67
Nodes (3): Frontend App Shell (index.html), Google Fonts (App), Storybook Google Fonts Preload

### Community 232 - "Community 232"
Cohesion: 0.67
Nodes (3): Lone tree silhouetted beneath the Milky Way in a starry night sky between hills, Large radio telescope satellite dish under a starry night sky with a meteor streak, The planet Saturn with its rings and the moon Titan, photographed from space

### Community 233 - "Community 233"
Cohesion: 0.67
Nodes (3): vite, O2 logo: 3D magnifying-glass forming the chemical symbol O2 with a superscript square, the OxygenQuiz app brand mark in teal, Vite logo: lightning-bolt mark in blue-to-purple and yellow gradient, the frontend build tool's default favicon

## Knowledge Gaps
- **764 isolated node(s):** `config`, `preview`, `QuizAPI.Tests.Discovery`, `QuizAPI.Tests.Editing`, `QuizAPI.Tests.Grading` (+759 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApplicationDbContext` connect `Community 93` to `REST Controller Base`, `Community 136`, `Community 137`, `Invite Codes API`, `Answer Grading Service`, `Audit Logs Controller`, `Backend Namespaces / Tests`, `Quiz Session Service`, `Question Models`, `Community 30`, `Community 159`, `Community 32`, `Community 33`, `Community 43`, `Community 44`, `Community 51`, `Community 54`, `Community 59`, `Community 62`, `Community 191`, `Community 66`, `Community 67`, `Community 74`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 210`, `Community 84`, `Community 86`, `Community 87`, `Community 89`, `Community 95`, `Community 97`, `Community 106`, `Community 107`, `Community 118`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `QuizAPI.Models` connect `Audit & Repositories` to `Community 134`, `REST Controller Base`, `Community 137`, `Invite Codes API`, `Questions API Controller`, `Audit Logs Controller`, `Backend Namespaces / Tests`, `Quiz Session Service`, `Question Models`, `Backend Service Namespaces`, `Community 33`, `Community 164`, `Community 54`, `Community 61`, `Community 62`, `Community 191`, `Community 80`, `Community 209`, `Community 82`, `Community 210`, `Community 89`, `Community 91`, `Community 93`, `Community 97`, `Community 118`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `QuizAPI.Data` connect `Audit & Repositories` to `Backend Namespaces / Tests`, `Backend Service Namespaces`, `Reports Service & Controller`, `Community 164`, `Community 54`, `Community 61`, `Community 211`, `Community 212`, `Community 213`, `Community 214`, `Community 215`, `Community 216`, `Community 217`, `Community 218`, `Community 219`, `Community 220`, `Community 221`, `Community 222`, `Community 223`, `Community 117`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `config`, `preview`, `QuizAPI.Tests.Discovery` to the rest of the system?**
  _789 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Card & Text Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05306930693069307 - nodes in this community are weakly interconnected._
- **Should `File Upload & LLM API (frontend)` be split into smaller, more focused modules?**
  _Cohesion score 0.033401967513154884 - nodes in this community are weakly interconnected._
- **Should `Form & Select UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.06617826617826618 - nodes in this community are weakly interconnected._