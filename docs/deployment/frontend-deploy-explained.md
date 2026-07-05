# Frontend Deploy, Explained (Cloudflare Workers + Wrangler)

> A from-scratch explanation of how the Oxygen Quiz **frontend** gets from your laptop to
> `https://oxygenquiz.com`: what Cloudflare Workers and Wrangler are, what each command and file does,
> why running `wrangler deploy` on your own machine updates the live site, and what that
> `*.workers.dev` subdomain is for. Written for someone who has never used Cloudflare before.
>
> Scope: this is about the **frontend** (the React app). The backend/API is a separate deployment
> (Docker on a VPS, reached at `api.oxygenquiz.com`) and is only mentioned where the two meet.

---

## 1. The 60-second mental model

The Oxygen Quiz frontend is a **static site**: `npm run build` turns the React source into a folder
of plain files (`dist/` — one `index.html`, a bunch of `.js`/`.css`/font files). Those files don't
"run" on a server the way the backend does; they just need to be **handed to browsers** when someone
visits the site.

Cloudflare hosts and hands out those files for us. The pieces:

- **Cloudflare Workers** — Cloudflare's platform for running/serving things on their global network.
  Ours is configured to just serve the `dist/` files (a "static assets" Worker).
- **Wrangler** — the command-line tool that uploads `dist/` to Cloudflare and flips the new upload
  live.
- **A custom domain** (`oxygenquiz.com`) — the address real users type, pointed at our Worker.
- **A `*.workers.dev` subdomain** (`oxygenquiz.kaloti.workers.dev`) — a free backup address Cloudflare
  gives the Worker; we mostly ignore it, but it has one important job (see §7).

The flow, end to end:

```
your code  ──npm run build──▶  dist/ (static files)  ──wrangler deploy──▶  Cloudflare's network
                                                                                    │
                                                    oxygenquiz.com ───points at───▶ your Worker
                                                                                    │
                                                                    serves dist/ to every visitor
```

---

## 2. What is Cloudflare, and what are Workers?

**Cloudflare** runs a large network of servers spread across the world ("the edge"). Their original
job was to sit in front of websites and make them faster and safer. Today they also let you *host*
applications directly on that network.

**Cloudflare Workers** is that hosting platform. Normally a "Worker" is a small program that runs on
Cloudflare's servers close to each user. But Workers also has a **static assets** mode, which is all
we use: instead of running code, the Worker just stores our `dist/` files and serves them to browsers.
No server of ours is running; Cloudflare serves the files from whichever of their locations is nearest
the visitor, which is why it's fast.

Two consequences worth internalizing:

1. **There's no "our server" for the frontend to keep alive.** Nothing to restart, no uptime to babysit.
   Cloudflare serves the files.
2. **A "deploy" just means uploading a new set of files** and telling Cloudflare "this set is the live
   one now." That's the whole job.

Our Worker is named **`oxygenquiz`** (you'll see this name in the dashboard and in `wrangler.jsonc`).

### The SPA detail

Oxygen Quiz is a **single-page application** (SPA): there's really only one HTML file, and React
Router draws different "pages" in the browser based on the URL. If a visitor loads
`oxygenquiz.com/dashboard/invite-codes` directly, there's no `dashboard/invite-codes.html` file to
serve. So the Worker is told: for any path you don't recognize, serve `index.html` and let React
figure out the route. That's this bit of config:

```jsonc
"assets": {
  "directory": "./dist",
  "not_found_handling": "single-page-application"
}
```

---

## 3. What is Wrangler?

**Wrangler** is Cloudflare's official command-line tool (CLI) for Workers. It's the thing that talks
to Cloudflare on your behalf. We don't install it as a project dependency; we run it on demand with
`npx wrangler ...`, which downloads and runs the latest version.

When you run `wrangler deploy`, it:

1. Reads `wrangler.jsonc` to learn *what* it's deploying (the Worker name, where the files are, etc.).
2. Uploads the files in `dist/` to Cloudflare.
3. Creates a new **version** of the Worker and **promotes** it to be the live one.
4. Makes sure at least one **address** points at the Worker (a custom domain and/or the workers.dev URL).

Think of Wrangler as the courier between your `dist/` folder and Cloudflare's network.

---

## 4. The files that control all this

### `wrangler.jsonc` — the deploy config

This file (in the repo root) tells Wrangler how to deploy. The important lines, in plain English:

- `"name": "oxygenquiz"` — which Worker this is. Uploads replace *this* Worker's files.
- `"compatibility_date"` — pins Cloudflare's runtime behavior to a date, so upgrades on their side
  don't silently change how our Worker behaves. Set-and-forget.
- `"workers_dev": true` — publish to the free `*.workers.dev` address. (Why this matters: §7.)
- `"assets"` — where the built files are (`./dist`) and the SPA fallback rule from §2.
- **No `routes` block** — we deliberately do *not* list the custom domains here. They're managed in
  the Cloudflare dashboard instead. (This is the fix for the deploy bug; §8 tells that story.)

The file has long comments explaining the `workers_dev` and "no routes" decisions — read those
alongside this doc.

### `package.json` — the build script

```jsonc
"scripts": {
  "build": "tsc -b && vite build"
}
```

`npm run build` type-checks (`tsc -b`) and then bundles the app (`vite build`) into `dist/`. Wrangler
never builds; it only ships whatever is already in `dist/`. **So you must `npm run build` before you
deploy**, or you'll ship the previous build.

### One thing baked in at build time: the API URL

The frontend needs to know where the backend lives. That URL comes from an environment file at
**build** time (`.env.production` → `VITE_API_URL=https://api.oxygenquiz.com/api`) and gets **hard-coded
into the bundled files**. This is why a production build must be built with the production env — if you
built with the dev settings, the live site would try to call `https://localhost:7153` and fail. (This
exact mistake is in `docs/deployment/known-issues.md`.)

---

## 5. How to deploy — the actual steps

From the repo root on your machine:

```bash
# 1. Build the production bundle (bakes in the prod API URL, outputs dist/)
npm run build

# 2. Upload dist/ and promote it live
npx wrangler deploy
```

That's it. The first time on a new machine, step 2 will pop open a browser window asking you to
**authorize Wrangler** to your Cloudflare account — that's the normal login (see §6). Approve it once
and Wrangler remembers you.

A healthy deploy ends with something like:

```
Deployed oxygenquiz triggers
  https://oxygenquiz.kaloti.workers.dev
Current Version ID: 686c57b6-...
```

After it finishes, **hard-refresh** `oxygenquiz.com` (Ctrl+Shift+R) to see the change — see §9 for why
that step is needed.

> **Tip — verify it actually went live:** Cloudflare dashboard → Workers & Pages → `oxygenquiz` →
> **Deployments**. The newest entry should be **Active** and its Version ID should match what the
> command printed.

---

## 6. Why running it on *your* machine updates the *live* app

This is the part that feels surprising, so here's exactly why it works.

`wrangler deploy` doesn't turn *your computer* into the server. It **uploads** your files to
**Cloudflare's** network over the internet, using Cloudflare's API. Your machine is just the courier;
Cloudflare is where the site actually lives. So "deploying from my laptop" really means "pushing my
files up to Cloudflare, which then serves them to the world."

Two things make this possible:

1. **Authentication.** The browser popup you approved linked Wrangler to your Cloudflare account (an
   OAuth login). From then on, Wrangler includes your credentials on every request, so Cloudflare
   trusts it to modify the `oxygenquiz` Worker. That's *why your machine specifically* can change the
   live site — it's acting as you, an authorized account owner.
2. **The custom domain is a permanent pointer to the Worker, not to a specific upload.**
   `oxygenquiz.com` is attached to the `oxygenquiz` Worker and always serves the Worker's **current
   live version**. When your deploy promotes a new version, the domain automatically starts serving it
   — you don't touch DNS or the domain settings at all. That's why one `wrangler deploy` is the whole
   story: upload → promote → the domain follows.

### "Versions" and "promotion"

Every deploy creates a new immutable **version** of the Worker (that `Version ID` in the output).
Deploying then **promotes** one version to be the active one. The live domain always serves the active
version. This is also why rollbacks are easy: in the dashboard you can promote an older version back to
active without rebuilding anything.

### The other deploy path: the Git-connected build

There are **two** ways this project can deploy, and they do the same thing:

- **Manual** — you run `npm run build && npx wrangler deploy` from your machine (what we did).
- **Automatic (CI)** — Cloudflare's "Workers Builds" is connected to the GitHub repo. When commits land
  on the deploy branch, Cloudflare spins up a temporary build machine, runs `npm run build`, then runs
  `npx wrangler deploy` for you — same commands, just on Cloudflare's computer instead of yours (it
  authenticates with a built-in token rather than your login).

Both promote a new version the same way. **Pick one path per change** so they don't race each other and
fight over which version is live (noted in `known-issues.md`). If you deploy manually, remember the CI
build will also fire on your next push.

---

## 7. What the `*.workers.dev` subdomain is for

Every Cloudflare account can claim one **workers.dev subdomain** — you chose `kaloti`, so this Worker
is reachable at **`oxygenquiz.kaloti.workers.dev`**. It serves the *exact same site* as
`oxygenquiz.com`; it's just a second, free address for the same Worker.

We turned it on (`"workers_dev": true`) for one concrete reason: **Wrangler refuses to finish a deploy
unless the Worker has at least one address pointing at it.** Because we intentionally removed the
custom domains from `wrangler.jsonc` (§8), the workers.dev URL is what satisfies that requirement and
lets the deploy complete and promote the new version. Without it, Wrangler would upload the files but
stop short of making them live — the exact "new bundle uploaded but old bundle still served" bug from
the project's history.

So, practically:

- **Real users** use `oxygenquiz.com`. Ignore the workers.dev address in day-to-day use.
- **The workers.dev address exists** so deploys have a valid target — and it doubles as a handy
  preview/debug URL if you ever want to check the Worker directly, bypassing the custom domain.
- **One-time setup:** the account had to *register* the workers.dev subdomain once (that's the
  "register a workers.dev subdomain?" prompt you accepted). If it's ever not registered, `wrangler
  deploy` will interactively prompt for it — which would **hang the automated CI build**, so it must
  stay registered.

### Custom domain vs workers.dev — quick contrast

| | `oxygenquiz.com` (custom domain) | `oxygenquiz.kaloti.workers.dev` |
|---|---|---|
| Who uses it | Real users | Us, occasionally; and Wrangler's deploy target |
| Set up where | Cloudflare dashboard (attached to the Worker) | Auto-created when the subdomain is registered |
| In `wrangler.jsonc`? | No (dashboard-managed) | Yes (`workers_dev: true`) |
| Serves | The Worker's live version | The same Worker's live version |

---

## 8. The bug we hit (and why the config looks the way it does)

For context, since the current config is shaped by this.

Originally `wrangler.jsonc` listed the custom domains as `routes` with `custom_domain: true`, telling
Wrangler to attach `oxygenquiz.com` / `www.oxygenquiz.com` to the Worker on every deploy. But those
domains had already been attached **by hand in the dashboard**. So each deploy, Wrangler tried to
create something that already existed, and Cloudflare rejected it with a **409 Conflict** ("already
exists"). Wrangler counted the whole deploy as failed and **never promoted the new version** — so the
new files were uploaded but `oxygenquiz.com` kept serving the *old* version, no matter how many times
you deployed.

The fix (current state):

- **Removed the `routes` block** so Wrangler stops trying to re-attach domains that already exist. The
  domains stay attached in the dashboard and keep serving the Worker's latest version on their own.
- **Enabled `workers_dev`** so the deploy still has a valid publish target and can promote the new
  version (§7).

Full write-up lives in `docs/deployment/known-issues.md` under "Operations / deployment."

---

## 9. Why a hard-refresh was needed (browser cache)

After a successful deploy, you sometimes still see the old site for a bit. That's **not** a failed
deploy — it's your **browser's cache**.

Browsers save copies of a site's files (HTML/JS/CSS) locally so pages load faster next time. Right
after a deploy, Cloudflare is already serving the new files, but your browser may still be showing you
its saved old copies. A **hard refresh** (Ctrl+Shift+R, or Cmd+Shift+R on Mac) tells the browser
"ignore your saved copies and re-download everything," so you see the new version.

How to tell a cache issue from a real deploy problem:

- **Old site after a successful deploy?** Almost always cache. Hard-refresh, or open the site in a
  private/incognito window (which has no cache). If the private window shows the new version, it *is*
  live and everyone else will get it as their cache expires.
- **Old site in a private window too?** Then the deploy didn't actually promote — check the dashboard
  Deployments list and the `wrangler deploy` output for errors.

---

## 10. Common gotchas / troubleshooting

- **"I deployed but nothing changed."** Did you `npm run build` first? Wrangler ships `dist/` as-is; if
  you skipped the build, you re-shipped the old files. Then check for browser cache (§9).
- **The live site calls `localhost` / CORS errors.** The build baked in the wrong API URL — build with
  the production env so `VITE_API_URL` points at `https://api.oxygenquiz.com/api` (§4).
- **Deploy hangs on "register a workers.dev subdomain?"** The subdomain got unregistered. Answer `Y`
  once (or register it in the dashboard). Critical for the CI build, which can't answer prompts.
- **A `409` / "triggers failed to deploy" comes back.** Something is trying to re-attach an existing
  custom domain — check that `wrangler.jsonc` still has **no** `routes` block and that the domains are
  only managed in the dashboard.
- **Two versions fighting / unexpected rollbacks.** You probably deployed manually *and* pushed to the
  branch the CI build watches. Use one path per change.
- **Need to undo a bad deploy fast.** Dashboard → Workers & Pages → `oxygenquiz` → Deployments →
  promote a previous version back to active. No rebuild needed.

---

## 11. Cheat sheet

```bash
# Deploy the frontend (from repo root)
npm run build            # build dist/ with the production API URL baked in
npx wrangler deploy      # upload dist/ + promote the new version live
# then: hard-refresh oxygenquiz.com (Ctrl+Shift+R)

# Useful checks
npx wrangler whoami            # which Cloudflare account Wrangler is logged into
npx wrangler deployments list  # history of versions for this Worker
```

- **Live site:** `https://oxygenquiz.com` (custom domain, for users)
- **Backup/preview + deploy target:** `https://oxygenquiz.kaloti.workers.dev`
- **Worker name:** `oxygenquiz`
- **Deploy config:** `wrangler.jsonc` (root)
- **Related docs:** `docs/deployment/known-issues.md` (deploy history + gotchas)
