# MongoDB — disabled (and how to bring it back)

> **Status: MongoDB is intentionally disabled (2026-06-28).**
> Multiplayer lobby chat is now fully **ephemeral** — messages live only in memory for the
> duration of a lobby and are never persisted. The app no longer connects to MongoDB, and
> deployments should **not** provision a Mongo instance.

## Why it was removed

MongoDB had exactly one active job: a **write-only** sink that archived every multiplayer lobby
chat line (`LobbyChatArchiver` → `lobbyChatMessages` collection). Nothing in the app ever read
those documents back — they existed only for potential audit/moderation. Since lobby chat is meant
to be ephemeral, that retention contradicted the product intent, so it was switched off. Removing it
also drops a whole piece of deployment infrastructure (no MongoDB Atlas cluster / container, one
fewer connection string and secret to manage, lower cost).

The live chat experience is unchanged: `InMemoryQuizSessionManager` still keeps the most recent
50 messages per lobby in its in-memory `RecentMessages` buffer, which is what users actually see.
Those messages are discarded when the lobby ends or the process restarts.

## What changed

Nothing was deleted — the code was only **unwired** so it's trivial to restore.

| File | Change |
|---|---|
| `OxygenBackend/QuizAPI/Program.cs` | Commented out the `IMongoClient` registration, the `ILobbyChatArchiver` registration, and the `using MongoDB.Driver;`. |
| `OxygenBackend/QuizAPI/Services/QuizSessionServices/InMemoryQuizSessionManager.cs` | Removed the `ILobbyChatArchiver` constructor dependency and the `Archive(...)` call. Chat now stays in the in-memory buffer only. |
| `OxygenBackend/QuizAPI/appsettings.json` | Removed the `MongoDB` section (`DatabaseName`). |
| `OxygenBackend/QuizAPI/appsettings.example.json` | Commented out `MongoDBConnection` with a pointer here. |
| `docker-compose.yml` | Removed the `mongodb` service, its `depends_on` health gate, the `MongoDBConnection` env var, and the `mongo-data` volume. |
| `docker-compose.dev.yml` | Removed the `mongodb` service and `oxygen-mongo-data` volume. |

### What was deliberately **kept** (dormant, for the future chat system)

- `OxygenBackend/QuizAPI/MongoDB/` — `MongoDbSettings.cs`, `Models/LobbyChatLog.cs`,
  `Models/Chat.cs`, `DTOs/ChatDTOs.cs`, `DTOs/User/ChatUserDTO.cs`.
- `OxygenBackend/QuizAPI/Services/QuizSessionServices/ILobbyChatArchiver.cs` (interface **and**
  `LobbyChatArchiver` implementation).
- `OxygenBackend/QuizAPI/Chat-System/` — the half-built persistent chat scaffolding
  (`UserSyncService`, `ConnectionService`, etc.; mostly commented out already).
- The **`MongoDB.Driver` NuGet package** in `QuizAPI.csproj` — kept so the dormant files above
  still compile. (Remove it only if you also remove those files.)

Because these compile but are never registered in DI, they have zero runtime effect today.

## How to re-add MongoDB (when the persistent chat system lands)

The chat work itself is a larger feature, but turning Mongo back on is mechanical:

1. **Re-register the client** in `Program.cs` — uncomment the `using MongoDB.Driver;` and the
   `// --- MongoDB (disabled) ---` block that registers `IMongoClient`.

2. **Re-register the archiver** (only if you still want lobby-chat retention) — uncomment
   `builder.Services.AddSingleton<ILobbyChatArchiver, LobbyChatArchiver>();`, then re-add the
   `ILobbyChatArchiver` constructor parameter and the `_chatArchiver.Archive(sessionId, message);`
   call in `InMemoryQuizSessionManager.AddChatMessageAsync`. **Skip this step** if lobby chat
   should remain ephemeral and only the *new* chat system uses Mongo.

3. **Restore config:**
   - `appsettings.json` → re-add `"MongoDB": { "DatabaseName": "OxygenQuiz" }`.
   - `appsettings.example.json` → uncomment the `MongoDBConnection` line.
   - Supply the secret out of source control:
     - Dev: `dotnet user-secrets set "ConnectionStrings:MongoDBConnection" "mongodb://localhost:27017"`
     - Prod: env var `ConnectionStrings__MongoDBConnection` (e.g. a MongoDB Atlas SRV string).

4. **Restore the database container(s):**
   - `docker-compose.dev.yml` → re-add the `mongodb` service (`mongo:6`, port `27017`) and the
     `oxygen-mongo-data` volume.
   - `docker-compose.yml` → re-add the `mongodb` service, the backend `depends_on` health gate,
     the `ConnectionStrings__MongoDBConnection` env var, and the `mongo-data` volume.
   - Production: provision a managed cluster (MongoDB Atlas free **M0** is enough to start) and set
     the connection string as a secret.

5. **Build the chat feature** against `IMongoClient` (collections, indexes, read paths, a hub/
   controller). The kept files under `MongoDB/` and `Chat-System/` are the starting point.

> Tip: the git commit that disabled Mongo is the exact reverse-map for steps 1–4 — `git show` it to
> see precisely which lines to uncomment.

## Related

- [`deployment.md`](../deployment/deployment.md) — production hosting (no Mongo needed at launch).
- [`README.md`](../README.md) — local dev setup.
