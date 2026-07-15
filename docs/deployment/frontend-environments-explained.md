# Frontend Environments, Explained (dev vs prod, env files, and how the API URL reaches the VPS)

> Written to be read top to bottom by someone who has never touched Vite env files.
> Companion to [`frontend-deploy-explained.md`](./frontend-deploy-explained.md) (how the build gets
> shipped to Cloudflare) and [`configuration.md`](./configuration.md) (how the **backend** reads config).

---

## 1. The 60-second mental model

The frontend is built **twice, differently**, depending on what you're doing:

- `npm run dev` → **development** build. Runs on your machine, talks to your local backend, and shows
  full error details when something breaks.
- `npm run build` → **production** build. A static bundle that ships to Cloudflare, talks to the live
  backend at `https://api.oxygenquiz.com`, and hides error internals from users.

Which settings each build uses comes from **environment files** (`.env.development`, `.env.production`).
Vite picks the right one automatically based on the command. You never edit code to switch — you just
run the matching command.

That's the whole idea. The rest of this doc explains the pieces.

---

## 2. The env files — what they are and which is which

Vite loads a per-mode file automatically:

| File               | Loaded when            | Holds                                    | In git? |
| ------------------ | ---------------------- | ---------------------------------------- | ------- |
| `.env.development` | `npm run dev`          | Local dev URLs (localhost backend)       | ✅ Yes  |
| `.env.production`  | `npm run build`        | Live URLs (`api.oxygenquiz.com`)         | ✅ Yes  |
| `.env.local`       | any mode (overrides)   | Machine-specific overrides — secrets etc | ❌ No (`*.local` is gitignored) |

**Every variable name starts with `VITE_`.** That prefix is a rule, not a style choice: Vite only
exposes `VITE_`-prefixed variables to the frontend code. Anything without the prefix is ignored.

Current contents:

```dotenv
# .env.development
VITE_API_URL=https://localhost:7153/api      # your local ASP.NET backend
# VITE_LLM_URL=http://localhost:8000          # disabled — no LLM in use

# .env.production
VITE_API_URL=https://api.oxygenquiz.com/api  # the live backend on the VPS
# VITE_LLM_URL=                               # disabled — no LLM in use
```

### Why `.env.development` and `.env.production` ARE committed to git

This surprises people, because "don't commit .env files" is common advice. The real rule is
**"never commit *secrets*,"** not "never commit .env files." Two facts make these two files safe:

1. **They contain no secrets** — only public URLs.
2. **`VITE_` values are public anyway.** At build time Vite copies each `VITE_` value directly into the
   JavaScript that ships to every visitor's browser. Anyone can open DevTools and read them. Committing
   them to git exposes nothing that isn't already public.

And there's a reason we *must* commit them: our CI (Cloudflare "Workers Builds") runs `npm run build`
on a fresh machine straight from the repo. If `.env.production` weren't in the repo, that build would
have no `VITE_API_URL` and would ship a broken bundle pointing at `localhost`.

> **Golden rule:** a `VITE_` variable can never safely hold a secret, because it ends up in the public
> bundle. Real secrets (DB passwords, JWT keys) live on the **backend** — see `configuration.md`.

---

## 3. How you get real error messages in development

When the app crashes, a React error boundary shows the fallback screen in
`src/pages/UtilityPages/Error/Main.tsx`. It has two behaviors:

- **In development** — show the actual error message and stack trace, so you can debug.
- **In production** — show a friendly "Something went wrong" and hide the internals from users.

The switch is one line:

```tsx
const isDevelopment = import.meta.env.DEV;   // true under `npm run dev`, false in a build
```

`import.meta.env.DEV` is a built-in Vite flag: `true` during `npm run dev`, and compiled to `false`
(and tree-shaken out) during `npm run build`. So the debug block literally cannot appear in production.

> **Gotcha we hit:** this line was previously hardcoded to `const isDevelopment = false`, which meant
> the debug block never rendered — not even in development. If dev errors ever stop showing details,
> check this line first.

Note `DEV` tracks the **build mode**, not which API you point at. You can run `npm run dev` against the
production API and still get full dev error details — the two concerns are independent.

---

## 4. Follow `VITE_API_URL` from the code all the way to the VPS

This is the variable that matters most: it's the base URL for **every** backend call the frontend makes.

### Step 1 — the code reads it
In `src/lib/Api-client.ts`, the Axios client is created with:

```ts
baseURL: import.meta.env.VITE_API_URL,
```

So every request (login, quizzes, everything) gets this URL as its prefix.

### Step 2 — the value is baked in at build time
`npm run build` replaces `import.meta.env.VITE_API_URL` with the literal string from `.env.production`
and hard-codes it into the bundle. **This is why the production build must be built with the production
env** — build with dev settings and the live site would call `https://localhost:7153` and fail.

### Step 3 — the browser calls `https://api.oxygenquiz.com`
The live bundle now points every request at `https://api.oxygenquiz.com/api`. Here's what that hostname
actually resolves to:

```
browser
  │  https://api.oxygenquiz.com/api/...
  ▼
Cloudflare edge            (DNS for the domain lives at Cloudflare; the record is "proxied",
  │                         so the browser gets a Cloudflare IP, NOT the VPS IP)
  │  https  (Full strict)
  ▼
Nginx on the VPS  :443     (terminates TLS with a Cloudflare Origin certificate)
  │  proxy_pass
  ▼
ASP.NET backend  127.0.0.1:5000
```

So the domain resolves to **Cloudflare**, which forwards to your VPS's Nginx, which forwards to the
backend process. The VPS's raw IP is never handed to browsers.

---

## 5. "Why a domain and not just the raw VPS IP?"

The VPS does have a raw IP — but pointing browsers straight at it is the wrong tool, for concrete
reasons:

- **HTTPS is effectively impossible on a bare IP.** Trusted certificate authorities don't issue certs
  for IP addresses, so a raw-IP backend means plain HTTP or scary cert warnings. Since the frontend is
  HTTPS, any HTTP call is **blocked by the browser as "mixed content."** (This is exactly why the old
  bare-IP LLM URL `http://3.79.13.249:8000` was a problem, and why it's now removed.) A domain gets a
  valid cert.
- **The origin stays hidden.** With Cloudflare proxying, attackers see Cloudflare's IP, not your VPS —
  you get DDoS protection and can't be hit directly.
- **The address is stable.** Because `VITE_API_URL` is baked into the bundle at build time, a hardcoded
  IP would force a full rebuild every time the server IP changed. With a domain, you update one DNS
  record instead.
- **Auth is domain-bound.** The backend is configured with issuer `https://api.oxygenquiz.com` and CORS
  origin `https://oxygenquiz.com`. Cookies and JWT validation depend on stable hostnames, not IPs.

The raw IP is an implementation detail sitting behind the DNS record — not something the frontend (or
users) should ever see.

---

## 6. Quick reference

| I want to…                                     | Do this                                                        |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Run the app locally against my local backend   | `npm run dev` (uses `.env.development`)                        |
| Build the site that ships to production        | `npm run build` (uses `.env.production`)                      |
| Change where production API calls go           | Edit `VITE_API_URL` in `.env.production`, then rebuild        |
| See full error details when something breaks   | Run in dev mode — `import.meta.env.DEV` turns the debug block on |
| Add a new frontend setting                     | Name it `VITE_SOMETHING`; **never** put a secret in it         |
| Store an actual secret                         | Put it on the backend (see `configuration.md`), never in `VITE_` |

### Common gotchas
- **Forgot to rebuild after changing `.env.production`.** The old URL is baked into the old bundle;
  changes only take effect on the next `npm run build` + deploy.
- **Put a secret in a `VITE_` var.** It's now public in the shipped JS. Rotate it and move it to the backend.
- **Dev errors show no detail.** Check that `isDevelopment` in `Main.tsx` reads `import.meta.env.DEV`,
  not a hardcoded value.
