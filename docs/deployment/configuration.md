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
`--env-file`. Note precisely what that flag does — it supplies `${...}` **interpolation inside the
compose file only**, it does not inject variables into the container. A name that appears in
`.env.prod` but is never referenced by a `- Key__Sub=${NAME}` line in the compose file never
reaches the app. See [`production-topology.md`](production-topology.md). So the effective production config is:

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
| `Authentication:Google:Enabled` / `:ClientId` | env vars (`Authentication__Google__Enabled`, `…__ClientId`) | Required for Google sign-in. **No client secret exists** — the app runs the GIS ID-token flow. `Enabled=true` with a blank `ClientId` fails startup; `Enabled=false` is silent, so omitting these ships social login switched off with no error. |
| `Ai:ApiKey` | env var (`Ai__ApiKey`) | The fourth real secret, once AI generation is switched on. Blank with `Ai__Enabled=true` **switches the AI features off** — it does not fail startup; see the note below the table. |
| `Ai:Enabled` | env var (`Ai__Enabled`), else `appsettings.json` | Off by default. One switch for **both** AI features — quiz generation and the category-palette proposer. |
| `Ai:Vendor` | `appsettings.json`, or `Ai__Vendor` to differ per environment | Names an entry in `Ai:Vendors`. **The only value you change to swap vendor.** Currently `groq` everywhere. An unknown name switches AI off rather than guessing. |
| `Ai:Vendors:<name>:*` | `appsettings.json` | The catalogue: `BaseUrl`, `Model`, `ReasoningEffort`, and both cost-per-million rates, as one unit. They are one decision, and grouping them is what stops half a vendor swap being possible. Entries not selected by `Ai:Vendor` are inert. |
| `Ai:BaseUrl`, `Ai:Model`, `Ai:ReasoningEffort`, the two cost rates | **resolved** from the selected `Ai:Vendors` entry | Outputs, not inputs. Setting them directly still works and warns at startup — it is the deprecated form. Costs stay ours to keep current: nothing checks them against the vendor, and both budget caps are enforced against them, which is why a rate of zero is now refused. |

> **The AI settings do not fail startup, and the auth settings do.** That difference is deliberate.
> An unusable `Ai` section switches the AI features off, logs the reason at `Error`, and lets the
> rest of the API start — AI is one optional feature and nothing else depends on it, so refusing to
> boot would trade a small outage for a total one. `Authentication:Google:Enabled=true` with a blank
> `ClientId` still refuses to start. Reasoning in
> [`../adr/0004-ai-misconfiguration-disables-the-feature.md`](../adr/0004-ai-misconfiguration-disables-the-feature.md).
>
> The practical consequence: **after an AI config change, a working site is not proof it took.**
> Check the boot log — `docker compose -f docker-compose.prod.yml logs backend | grep '\[AI\]'`.
> `[AI] Ready — vendor "groq", model … at …` is the line you want; the switched-off line names the
> key to fix.

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

**B. Stale values in `appsettings.Production.json` look scary but are inert.** (Historical: it
used to list old AWS CORS origins; it now lists the correct `oxygenquiz.com` /
`www.oxygenquiz.com` pair, so the trap described here no longer exists. The reasoning is kept
because the override mechanism is still worth understanding.) Because the compose injects `Cors__AllowedOrigins__*` env vars, those override the file at
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
