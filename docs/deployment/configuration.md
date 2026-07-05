# Configuration & Settings — how OxygenQuiz reads its config

> A study-oriented deep dive into **how the .NET backend decides what its settings are** — where
> `appsettings.json`, environment-specific files, environment variables, and secrets fit together, and
> which one wins when they disagree. If you've ever looked at a value in `appsettings.json` and thought
> "but that's not what production actually uses," this is the doc that explains why.
>
> Related: [`infrastructure.md`](infrastructure.md) §11 (the short version + where secrets live),
> [`deployment-runbook.md`](deployment-runbook.md) (operational commands, admin login).

---

## 1. The one-sentence mental model

.NET loads configuration from several **sources in order**, and **later sources override earlier
ones**. Reading a setting (`_config["Seed:AdminEmail"]`) returns the value from the *last* source that
provided it. So config is a stack of layers, each able to overwrite keys from the layers beneath it.

```
   ┌─────────────────────────────────────────────┐  ← wins (highest priority)
   │ 4. Environment variables (+ .env.prod)       │
   ├─────────────────────────────────────────────┤
   │ 3. User-secrets           (Development only) │
   ├─────────────────────────────────────────────┤
   │ 2. appsettings.{Environment}.json            │
   ├─────────────────────────────────────────────┤
   │ 1. appsettings.json         (base, always)   │
   └─────────────────────────────────────────────┘  ← loses (lowest priority)
```

> The exact source order is set up by `WebApplication.CreateBuilder(args)`, which is the first line of
> `Program.cs`. It wires these providers in this order by convention; you rarely need to change it.

---

## 2. The layers, one at a time

### 1. `appsettings.json` — the base
Loaded in **every** environment, always. Think of it as the defaults. In this repo it holds things like
`Logging`, `AllowedHosts`, and (dev-flavored) `Jwt:Issuer`/`Audience` pointing at `localhost`. Those
"wrong for production" values are fine **because higher layers overwrite them** in prod.

### 2. `appsettings.{Environment}.json` — the per-environment overlay
Loaded **only** when the file's name matches the current `ASPNETCORE_ENVIRONMENT`:

- `ASPNETCORE_ENVIRONMENT=Development` → loads `appsettings.Development.json`
- `ASPNETCORE_ENVIRONMENT=Production`  → loads `appsettings.Production.json`

**This is the single most important thing to internalize:** in production, `appsettings.Development.json`
is **never read**. All the convenient dev values in that file — the `localhost` CORS origins, the sample
seed data, and `Seed:AdminEmail = "kaloti.avdiaj@gmail.com"` — simply do not exist as far as the live
server is concerned. (Our compose sets `ASPNETCORE_ENVIRONMENT=Production`, so only
`appsettings.Production.json` overlays the base.)

### 3. User-secrets — development only
`dotnet user-secrets` stores secrets *outside* the repo on your dev machine (so `Jwt:Key` and
`Seed:AdminPassword` never get committed). This provider is only added when running in Development, so it
**does nothing in production** — prod uses env vars instead (layer 4).

### 4. Environment variables — the top layer (this is what production actually uses)
Environment variables override everything above them. In production, this is where the *real* values
come from: the compose file passes them in, and secrets are loaded from `~/OxygenQuiz/.env.prod` via
`--env-file`. So the effective production config is:

```
appsettings.json  +  appsettings.Production.json  +  environment variables (incl. .env.prod)
```

---

## 3. The `__` (double-underscore) nesting convention

JSON config is hierarchical, but environment variables are flat `KEY=value` pairs. .NET bridges the two
by treating **`__` (two underscores) as the nesting separator**. So this JSON:

```json
{
  "Seed": { "AdminPassword": "..." },
  "Jwt":  { "Issuer": "https://api.oxygenquiz.com" },
  "Cors": { "AllowedOrigins": [ "https://oxygenquiz.com" ] }
}
```

is expressed as these environment variables:

| JSON path | Environment variable |
|---|---|
| `Seed:AdminPassword` | `Seed__AdminPassword` |
| `Jwt:Issuer` | `Jwt__Issuer` |
| `Cors:AllowedOrigins[0]` | `Cors__AllowedOrigins__0` |
| `Cors:AllowedOrigins[1]` | `Cors__AllowedOrigins__1` |

Two things to note:

- In **code** you read these with a **colon**: `_config["Seed:AdminPassword"]`,
  `_config.GetSection("Cors:AllowedOrigins")`. The colon is the in-code separator; `__` is only for the
  environment-variable *name* (because `:` isn't allowed in env var names on some shells).
- **Arrays use a numeric index**: `Cors__AllowedOrigins__0`, `__1`, and so on. Each index is its own env
  variable.

---

## 4. Where each production value actually comes from

A quick map of the settings that matter, and which layer supplies them in prod:

| Setting | Source in production | Notes |
|---|---|---|
| `POSTGRES_PASSWORD`, `JWT_KEY`, `ADMIN_PASSWORD` | env vars from `.env.prod` | The three real secrets. Never in Git. |
| `Jwt:Issuer` / `Jwt:Audience` | env vars (`Jwt__Issuer`, …) | Base file's `localhost` values are overridden. |
| `Cors:AllowedOrigins` | env vars (`Cors__AllowedOrigins__0`, …) | Overrides both `appsettings.json` and the stale `appsettings.Production.json` list. |
| `AllowedHosts` | env var | Base file says `"*"`; prod pins the real host. |
| `Seed:AdminUsername` | code default `"admin"` (unless env set) | — |
| `Seed:AdminEmail` | **code default `"admin@example.com"`** (unless `Seed__AdminEmail` set) | ⚠️ the login trap — see §6. |

---

## 5. How to inspect what's actually loaded

When in doubt, don't guess — look:

```bash
# The raw secrets file the compose feeds in:
cat ~/OxygenQuiz/.env.prod
grep -iE "ADMIN|SEED|JWT|POSTGRES" ~/OxygenQuiz/.env.prod   # NOTE: use | not / to OR terms

# Everything the running backend container actually has in its environment:
docker compose -f docker-compose.prod.yml exec backend printenv | grep -iE "SEED|JWT|CORS|POSTGRES|ASPNETCORE"

# What environment the app thinks it's in (also printed in the boot logs):
docker compose -f docker-compose.prod.yml exec backend printenv ASPNETCORE_ENVIRONMENT
```

> The `WARN "X variable is not set. Defaulting to a blank string"` messages you see on `logs`/`ps` are
> **cosmetic** — they only mean *your current shell* doesn't have the variable, not that the running
> container lacks it. They disappear when you include `--env-file .env.prod`. See runbook §3.

---

## 6. Real-world traps (both of which we hit)

**A. The admin email defaulted to `admin@example.com`.** Login is by **email**. The friendly
`kaloti…` admin email lives only in `appsettings.Development.json`, which prod doesn't load, and no
`Seed__AdminEmail` env var was set — so the seeder used its code default `admin@example.com`. Logging in
with the dev email returned 401. (And the admin is seeded **once**: changing `ADMIN_PASSWORD` later
doesn't touch an existing account — you'd have to reset the `PasswordHash` or delete-and-reseed.)

**B. Stale values in `appsettings.Production.json` look scary but are inert.** It still lists old AWS
CORS origins. Because the compose injects `Cors__AllowedOrigins__*` env vars, those override the file at
runtime — so prod CORS is actually correct despite the misleading file. (Still worth fixing the file so
it doesn't mislead; tracked in [`known-issues.md`](known-issues.md).)

**The general lesson:** a "wrong-looking" value in a JSON file is only a real problem if **no higher
layer overrides it**. The dangerous settings are the ones with *no* env var and *no* entry in
`appsettings.Production.json`, because those silently fall through to the base file or a hard-coded
default.

---

## 7. Quick reference

- **Precedence (low → high):** `appsettings.json` → `appsettings.{Environment}.json` → user-secrets
  (dev) → environment variables (incl. `.env.prod`). Last one wins.
- **In production only these apply:** `appsettings.json` + `appsettings.Production.json` + env vars.
  `appsettings.Development.json` and user-secrets are **not** loaded.
- **Env var naming:** `Section__Key` for nesting, `Section__Key__0` for array items. In code, read with
  `Section:Key`.
- **Secrets in prod** come from `~/OxygenQuiz/.env.prod` (chmod 600), fed in via
  `docker compose --env-file .env.prod`.
- **To debug config:** `docker compose … exec backend printenv`.
