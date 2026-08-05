# Storybook — Component Workbench & Story Authoring Guide

Storybook is our **isolated workbench for UI**. It renders a single component (or a whole
page) in any state we choose — without running the full app, logging in, hitting the API, or
playing through a quiz. Use it to build and review components in every state on your own time,
catch visual regressions (via Chromatic), and document how a component behaves.

It complements, but does not replace, the rest of our testing:

| Layer | Tool | Answers |
|-------|------|---------|
| **See it / play with states** | **Storybook** (this doc) | "Does it *look* right in every state?" |
| **Automated correctness** | Vitest + Testing Library (`*.test.tsx` in `__tests__/`) | "Does clicking X still do Y after a change?" |
| **Full end-to-end** | Playwright (installed, not yet configured) | "Does a real 2-player match work over SignalR?" |

---

## Running Storybook

From the repo root:

```bash
npm run storybook          # dev server with hot-reload at http://localhost:6006
npm run build-storybook    # static build into storybook-static/ (CI / sanity check)
npm run chromatic          # publish stories to Chromatic for visual-regression review
```

- `npm run storybook` is what you'll use day to day. Edit a component or story and the preview
  updates instantly.
- `npm run build-storybook` compiles **every** story. It's the quickest way to confirm a change
  didn't break a story's types — if it builds, the stories type-check. (`storybook-static/` is
  git-ignored.)
- `npm run chromatic` screenshots each story and flags pixel diffs against the last baseline.

---

## How our setup works

All configuration lives in `.storybook/`:

| File | Responsibility |
|------|----------------|
| [`.storybook/main.ts`](../../.storybook/main.ts) | Finds stories (`../src/**/*.stories.@(ts\|tsx)`), registers addons, uses the **react-vite** builder. The builder auto-merges our root `vite.config.ts`, so the `@/...` path alias works in stories with **no extra config**. |
| [`.storybook/preview.tsx`](../../.storybook/preview.tsx) | The part that makes stories look like the real app: imports `src/global.css`, applies the `dark`/`light` class on `<html>`, and adds a **theme toggle** to the toolbar. |
| [`.storybook/preview-head.html`](../../.storybook/preview-head.html) | Loads the same Google Fonts as `index.html` (Titillium Web, DynaPuff, …). |

> **Why this matters:** Storybook renders inside its own iframe. Without `preview.tsx` importing
> `global.css` and applying the theme class, every `hsl(var(--background))` and `font-header`
> resolves to nothing and components look unstyled. If a story ever looks "wrong," suspect this
> file first — see [Troubleshooting](#troubleshooting).

---

## How Storybook works (the mental model)

A **story** is a single rendered state of a component. A `*.stories.tsx` file has:

1. A **default export** (`meta`) — which component, where it lives in the sidebar (`title`),
   and shared `args`/`parameters`.
2. One or more **named exports** — each is one story (one state) you click between in the sidebar.

A story **imports the real component** — it is not a copy. So:

- Change the component's *markup, styling, or internal logic* → stories show the new version
  automatically. **No story edit needed.**
- Change the component's *props (its contract)* → you update the story to match. TypeScript
  (via the `satisfies Meta` / `StoryObj<typeof meta>` typing) makes a broken story fail to
  compile, so it can't silently drift out of sync.

The Storybook UI gives you, per story:

- **Controls** — live-edit any prop without writing code.
- **Actions** — callback props wrapped with `fn()` log their calls here when fired.
- **Accessibility** — the a11y addon flags contrast/ARIA issues automatically.

The sidebar tree comes from each story's `title`, **not** the file location — so we co-locate
files for maintenance and organize the sidebar however we like via `title`.

---

## Writing a new story — best practices

### 1. Co-locate the file

Put `component.stories.tsx` in the **same folder** as `component.tsx`. (Tests go in a
`__tests__/` subfolder; stories sit right next to the component.) Moving or deleting the
component then takes its story with it.

### 2. Use the CSF3 format with full typing

This is our standard shape — copy it:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { PaginationControls } from "./pagination-control";

const meta = {
  title: "UI/PaginationControls",        // sidebar path: UI ▸ PaginationControls
  component: PaginationControls,
  parameters: { layout: "centered" },    // "centered" | "fullscreen" | "padded"
  args: { onPageChange: fn() },          // shared across all stories below
} satisfies Meta<typeof PaginationControls>;   // ← keep `satisfies` for type-safety

export default meta;
type Story = StoryObj<typeof meta>;

// One export per state:
export const FirstPage: Story = {
  args: { pagination: { currentPage: 1, totalPages: 20, /* … */ } },
};
export const MiddlePage: Story = {
  args: { pagination: { currentPage: 10, totalPages: 20, /* … */ } },
};
```

Conventions:

- **`title`** — group by area: `"UI/…"` for shared primitives, `"Quiz/…"`, `"Quiz/Multiplayer/…"`
  for feature components. Use `/` to nest in the sidebar.
- **One export per meaningful state** — empty, loading, error, "first/middle/last", success vs
  failure. The set of stories is your visual spec for the component.
- **`fn()` for every callback prop** — gives you a spy in the Actions tab and prevents runtime
  errors from undefined handlers.
- **`layout`** — `centered` for small components, `fullscreen` for pages/full-width views.

### 3. Story the presentational component, not the data-fetching wrapper

This is the most important rule for storying **pages**. A component is storyable when its data
comes in through **props**; it is *not* directly storyable when it fetches its own data via hooks
(React Query, SignalR, router) inside itself.

Our quiz components are built the right way for this:

- [`QuizInterface`](../../src/pages/Quiz/Sessions/components/quiz-taking-process/quiz-interface.tsx)
  takes `currentQuestion` / `lastAnswerResult` as props — the session fetching lives in the route
  wrapper above it. So we story the whole quiz screen with hand-written fake data.
- [`MultiplayerGame`](../../src/pages/Quiz/Multiplayer/components/game/MultiplayerGame.tsx) takes a
  `match` object as a prop and renders off `match.phase`. The SignalR connection lives in the
  `useMatch` hook, **not** the component — so no server, no second player.
- [`LobbyPageView`](../../src/pages/Quiz/Multiplayer/LobbyPageView.tsx) is the whole pre-match lobby
  (room code, CTA, roster, quiz panel, chat) as one prop-driven component; `MultiplayerLobbyPage`
  is the thin wrapper that calls `useLobbyConnection`/`useMatch` and renders it. See "Splitting a
  hook-wired component" and "Slot props" below for how it handles the pieces that can't just be
  props.

> When you build new feature UI, keep fetching in hooks and rendering in prop-driven components.
> That separation is what makes a page storyable (and easier to test) in the first place.

#### Splitting a hook-wired component: the `*-view.tsx` twin

Existing components aren't always built this way from the start. When a component you need to
story calls live hooks directly (auth, SignalR, React Query) instead of taking props, split it
into two files rather than trying to mock the hooks:

- `component-name.tsx` — unchanged public export/props, but now just calls the real hooks and
  renders `<ComponentNameView {...derivedProps} />`. This is what production imports; nothing
  that already uses the component needs to change.
- `component-name-view.tsx` — the actual markup, taking everything as props. This is what gets
  storied.

We did this for six components that each called live hooks directly (auth, SignalR, a real
network ping, or React Query): `CreateLobbyDialog`, `JoinLobbyDialog`, `ConnectionStatusBadge`,
`LobbyChat`, `QuizSelectionDialog`, and `AiQuizWizard` → their `*-view.tsx` twins. Compare
[`join-lobby-dialog.tsx`](../../src/pages/Quiz/Multiplayer/components/join-lobby-dialog.tsx) (owns
`useUser`/`useConnectionStatus`/navigation) against
[`join-lobby-dialog-view.tsx`](../../src/pages/Quiz/Multiplayer/components/join-lobby-dialog-view.tsx)
(pure props, storied in `join-lobby-dialog-view.stories.tsx`).

`AiQuizWizard` is the fullest example of the split: the container owns three React Query
lookups, `useLocation`, the clipboard write and the parse call, while
[`ai-quiz-wizard-view.tsx`](../../src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/ai-quiz-wizard-view.tsx)
takes every field as a controlled prop. It's controlled rather than self-stateful on
purpose: "step 2, source material past the length warning, three questions dropped by the
parser" has to be expressible as **args**, and any state the view keeps privately is a state
no story can set. Route prefixes are props too (`quizzesPath`, `manualCreatePath`) — the
same wizard is mounted under `/dashboard` and `/my-dashboard`.

#### Extracting a screen that's inline in a page

Some UI has no component to story yet because it was written inline. The manual-vs-AI quiz
chooser was ~55 lines of JSX inside `Quizzes.tsx`, a page wired to five queries — nothing
about that dialog needed any of them. It became
[`create-quiz-method-dialog.tsx`](../../src/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog.tsx),
prop-driven and storyable, and the page just renders it.

Two things make an extracted overlay storyable:

- **Accept controlled `open`/`onOpenChange`, pass them straight to Radix.** Radix treats
  `open === undefined` as uncontrolled, so production keeps its trigger-driven behaviour
  while stories pin the dialog open with `args: { open: true }` — no click simulation.
- **Take routes/labels as props, not constants.** Hard-coded paths are what force a second
  copy of the component for the next surface that needs it.

#### Slot props: when a child genuinely can't be prop-driven at the parent level

Sometimes a *page* is prop-driven but a couple of its children legitimately own live state (a
chat subscription, a live search) that doesn't belong hoisted up into the page's props — that
would just move the "hook-wired component" problem one level up. `LobbyPageView` takes
`chatSlot`/`quizSelectionDialogSlot` as `ReactNode` props instead: production passes the real
`<LobbyChat>`/`<QuizSelectionDialog>` (hook-wired), stories pass `<LobbyChatView>`/
`<QuizSelectionDialogView>` with fixture data. The page itself never imports the live hooks.

**Gotcha:** if a responsive layout needs a live slot to appear in visually different wrappers at
different breakpoints (e.g. chat as an always-open `Card` on desktop vs. a collapsible
`Accordion` on mobile), don't render the slot twice in two CSS-hidden trees — that double-mounts
whatever live subscription it owns. Pick the wrapper with a JS `matchMedia` check instead, so the
slot only ever mounts once. The lobby did this until its panel-board redesign gave `chatSlot` one
wrapper at all breakpoints; see `docs/RESPONSIVE.md` for the rule and why not needing the branch
beats implementing it.

### 4. Mock complex props with a typed factory

When a prop is a big object (like the multiplayer `match`), build a factory typed against the
**real source type** so the mock can't drift:

```tsx
import type { useMatch } from "../../hooks/use-match";   // `import type` → no SignalR bundled
type Match = ReturnType<typeof useMatch>;

// Full valid defaults; each story overrides only what its phase needs.
const makeMatch = (overrides: Partial<Match>): Match => ({
  phase: "idle", isActive: true, countdownSeconds: 3, question: null,
  /* …every field… */ submit: fn(async () => {}), reset: fn(),
  ...overrides,
});

export const Countdown: Story = { args: { match: makeMatch({ phase: "starting" }) } };
export const Reveal: Story    = { args: { match: makeMatch({ phase: "reveal", lastResult: { /* … */ } }) } };
```

Two details:

- **`import type`** borrows only the shape — none of the hook's runtime (SignalR/connection) is
  pulled into the story bundle.
- Typing the factory as `ReturnType<typeof useMatch>` means **adding a field to the hook makes
  this file fail to compile** until the mock is updated. Contract safety for free.

See the full example: [`MultiplayerGame.stories.tsx`](../../src/pages/Quiz/Multiplayer/components/game/MultiplayerGame.stories.tsx).

#### Better than a mock: run the real pure function

When the prop *is* the output of a pure function we own, don't hand-write the object — call
the function on a fixture input. `ai-quiz-wizard-view.stories.tsx` holds fixture LLM replies
(prose-wrapped, wrong-shaped, partially invalid) and passes
`parseResult: parseAiOutput(reply, ctx)`. The stories then render whatever the parser really
returns, so a parser regression becomes a Chromatic diff instead of a story that keeps
looking fine while production doesn't. Only reach for a factory when the value comes from
something you can't run in the browser (a hook holding a SignalR connection, a network
response).

### 5. Use `render` only when a story needs more than static args

Plain `args` covers most stories. Reach for a `render` function when:

- the props depend on "now" (e.g. a live countdown needs a `deadline` computed fresh on each
  mount), or
- you need to compose/wrap the component for the story.

```tsx
export const LiveQuestion: Story = {
  render: (args) => (
    <MultiplayerGame {...args} match={makeMatch({ phase: "question", deadlineUtc: inSeconds(25) })} />
  ),
};
```

### 6. Theme & providers

- **Theme** is handled globally — the toolbar toggle switches dark/light for every story. Don't
  re-wrap stories in `ThemeProvider`.
- **Zustand stores** (e.g. `useNotifications`) work with no setup — they're global, not context.
- If a component genuinely needs a React **context** provider (rare in our prop-driven
  components), wrap it with a `decorators: [(Story) => <SomeProvider><Story/></SomeProvider>]`
  on that story's `meta`.
- **`MemoryRouter`** whenever anything in the tree renders a react-router `Link` — it throws
  outside a router. See `Not-Found-Content.stories.tsx`, `create-quiz-method-dialog.stories.tsx`.
- **`QueryClientProvider`** when a *leaf* still calls React Query even though the component
  you're storying is prop-driven. The entity selects
  (`CategorySelect`/`DifficultySelect`/`LanguageSelect`) call
  `useCanSelectUnspecifiedLookup` → `useUser` to decide whether to offer the seeded
  "Unspecified" lookup, so any story containing them needs a client:

  ```tsx
  decorators: [(Story) => (
    <QueryClientProvider client={new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    })}>
      <MemoryRouter><Story /></MemoryRouter>
    </QueryClientProvider>
  )],
  ```

  `retry: false` / `enabled: false` keep a doomed `/Authentication/me` call from retrying in
  a loop; with no auth the user resolves to "not an admin", which only matters if a fixture
  includes an "Unspecified" row. Prefer this local decorator over adding a global one — the
  provider in a story file is a visible reminder that something down there isn't prop-driven
  yet. See `ai-quiz-wizard-view.stories.tsx`.

---

## Story checklist

Before you consider a story done:

- [ ] File is **co-located** with the component (`Foo.tsx` → `Foo.stories.tsx`).
- [ ] Uses CSF3 with `satisfies Meta<typeof X>` and `type Story = StoryObj<typeof meta>`.
- [ ] `title` follows the area convention (`UI/…`, `Quiz/…`).
- [ ] **All callback props use `fn()`**.
- [ ] There's **one story per meaningful state** (incl. empty/loading/error where relevant).
- [ ] Right `layout` (`centered` for widgets, `fullscreen` for pages).
- [ ] Complex object props use a **typed factory** (`Partial<RealType>` overrides) — or, if
      the value comes from a pure function we own, the **real function on a fixture input**.
- [ ] Decorators for anything the tree needs: `MemoryRouter` for `Link`s,
      `QueryClientProvider` if a leaf still calls React Query.
- [ ] `npm run build-storybook` passes (stories type-check). `npx tsc -p tsconfig.app.json
      --noEmit` covers the same types faster, since `include: ["src"]` picks up story files.

---

## Troubleshooting

**Components look unstyled / colors and fonts are wrong.**
The iframe isn't loading global styles. Confirm [`.storybook/preview.tsx`](../../.storybook/preview.tsx)
imports `../src/global.css` and applies the theme class, and that
[`.storybook/preview-head.html`](../../.storybook/preview-head.html) has the font `<link>`s. This is
the single most common cause and the reason a previous setup was abandoned.

**`Cannot find module '@/…'` in a story.**
The `@` alias comes from `vite.config.ts`, which the react-vite builder auto-merges. If it breaks,
check that `vite.config.ts` still defines the alias.

**A story won't compile after I changed a component.**
Expected — you changed the component's **props**. Update the story's `args`/factory to match; the
type error points at exactly what changed. (Internal-only changes never require a story edit.)

**`submit(...).catch is not a function` (or similar) in a mocked callback.**
The component awaits/chains the callback's return. Give the mock a real implementation:
`fn(async () => {})` instead of bare `fn()`.

---

## Canonical examples in this repo

Copy from these when writing new stories:

- **Single component** — [`pagination-control.stories.tsx`](../../src/components/ui/pagination-control.stories.tsx)
- **Full page (prop-driven)** — [`quiz-interface.stories.tsx`](../../src/pages/Quiz/Sessions/components/quiz-taking-process/quiz-interface.stories.tsx)
- **Complex/real-time view via a mocked object** — [`MultiplayerGame.stories.tsx`](../../src/pages/Quiz/Multiplayer/components/game/MultiplayerGame.stories.tsx)
- **Whole page composed from multiple views + slot props** — [`LobbyPageView.stories.tsx`](../../src/pages/Quiz/Multiplayer/LobbyPageView.stories.tsx)
- **`*-view.tsx` split off a hook-wired component** — [`join-lobby-dialog-view.stories.tsx`](../../src/pages/Quiz/Multiplayer/components/join-lobby-dialog-view.stories.tsx)
- **Multi-step flow + failure catalogue, results produced by the real parser** — [`ai-quiz-wizard-view.stories.tsx`](../../src/pages/Dashboard/Pages/Quiz/components/AI-Quiz/ai-quiz-wizard-view.stories.tsx)
- **Overlay extracted from a page, with controlled `open`** — [`create-quiz-method-dialog.stories.tsx`](../../src/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog.stories.tsx)
