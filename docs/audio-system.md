# Audio System

This document explains the sound/music feature added to OxygenQuiz: the concepts behind it,
every file involved, exactly where each sound is triggered from, and how to extend or replace it.

---

## 1. Overview

The app plays two kinds of audio:

- **SFX** — short one-shot effects (correct answer, wrong answer, countdown tick, whoosh, etc.).
- **Music** — looping background beds (currently a gameplay loop for live matches).

Everything lives under `src/lib/audio/`, plus one UI control (`src/components/ui/sound-toggle.tsx`)
and small trigger calls added to existing quiz code.

The design separates three responsibilities:

| Concern | Owned by | Lives |
| --- | --- | --- |
| Making noise (the sound objects) | `AudioManager` **singleton** | outside React |
| Remembering user preferences (mute, volumes) | Zustand **store** | React-observable + localStorage |
| Letting components talk to it | `useAudio` **hook** | React |

Key idea: **the store is "what the user wants," the singleton is "the machine that makes noise."**
Keeping them separate is what makes the system predictable.

---

## 2. Core concepts

### Singleton
A single shared instance created once for the whole app. We only ever want *one* thing owning the
sound objects and the current volume — not a fresh copy per component (that would cause the same
sound to play several times over itself on a re-render). Because the singleton lives **outside**
React, any code can use it — React components *and* plain callbacks like SignalR event handlers —
by importing it and calling `audio.play("correct")`.

### Zustand store
Zustand is the small state library already used elsewhere (`Notifications-store.ts`). A "store" is a
global bag of state plus functions to change it, that components can subscribe to. Ours holds the
user's **preferences** — `muted`, `musicVolume`, `sfxVolume` — persisted to `localStorage` so they
survive a refresh. When a preference changes, the store also pushes the new value into the singleton.

### `useAudio` hook
A hook is a function that lets a React component tap into shared logic/state. `useAudio()` is a thin
convenience wrapper that bundles the play functions (from the singleton) with the live preference
values and setters (from the store), so a component can do `const { play } = useAudio()` without
knowing about the layers underneath.

### Browser autoplay policy
Browsers keep audio silent until the user interacts with the page. Howler auto-unlocks on the first
gesture, and `AudioProvider` reinforces this by resuming the audio context on the first
pointer/keyboard event.

---

## 3. File-by-file

All paths are under `src/lib/audio/` unless noted.

### `generate-tone.ts`
Synthesizes **placeholder** sound clips as `data:` URIs (16-bit PCM WAV, built in memory and
base64-encoded). This is why the feature works with **zero asset files**. `makeTone([...segments])`
turns a list of `{ freq, dur, wave, vol }` segments into a playable clip. A short attack/release
envelope is applied to each segment to avoid clicks. **Delete this file once real audio is in place.**

### `sounds.ts`
The single **registry** of every sound, split into `SFX` and `MUSIC`. Each entry is a function that
returns a source string (currently a generated tone). The keys are the names you pass to `play()`
(e.g. `"correct"`). Exposes the `SoundName` and `MusicName` types. **This is the one place to edit to
add, rename, or swap sounds.**

### `AudioManager.ts` — the singleton
Wraps Howler. Responsibilities:
- `init()` — builds every `Howl` once (guarded; also a no-op in non-browser/test environments so
  unit tests and Storybook never break).
- `unlock()` — resumes a suspended audio context (best-effort, for autoplay policy).
- `play(name)` — plays an SFX; no-op while muted.
- `playMusic(name)` / `stopMusic()` — start/stop a looping bed with a short fade; switching tracks
  cross-fades.
- `setMuted`, `setSfxVolume`, `setMusicVolume` — driven by the store.

Exports the one instance: `export const audio = new AudioManager()`.

### `audio-store.ts` — the Zustand store
Holds `muted`, `musicVolume`, `sfxVolume` and their setters, wrapped in the `persist` middleware
(localStorage key `oxygen-audio-prefs`). Every setter also calls the matching method on the singleton.
`sync()` pushes all persisted values into the singleton once on load.

> **The singleton's own field defaults are not a way to change behaviour.** `AudioManager` declares
> `muted`, `sfxVolume` and `musicVolume` with initial values, but `AudioProvider` calls `sync()` in
> its mount effect, which immediately overwrites all three with the store's values — the persisted
> ones from `localStorage` under `oxygen-audio-prefs`, or the store's defaults on a first visit.
> Editing `private muted = true` in `AudioManager.ts` therefore silences nothing: the field is
> overwritten before any sound plays. Change the default in **`audio-store.ts`** (and note that a
> persisted preference still wins over it for anyone who has used the app before), or call
> `setMuted` through the store.

### `useAudio.ts` — the hook
Returns `{ play, playMusic, stopMusic, unlock, muted, musicVolume, sfxVolume, setMuted, toggleMuted,
setMusicVolume, setSfxVolume }`. Use in components. In non-component callbacks, import `audio`
directly instead.

### `AudioProvider.tsx`
Mounted once near the app root (in `src/Provider.tsx`). On mount it calls `audio.init()`, applies
persisted prefs via `sync()`, and registers one-time `pointerdown`/`keydown` listeners to unlock
audio. Renders its children unchanged.

### `index.ts`
Barrel export — import from `@/lib/audio`:
```ts
import { audio } from "@/lib/audio";        // singleton, for any callback (e.g. SignalR)
import { useAudio } from "@/lib/audio";      // hook, for React components
import { AudioProvider } from "@/lib/audio";  // mount once at the app root
```

### `howler-shim.d.ts`
A minimal local type declaration for the subset of Howler we use, added because `@types/howler`
could not be installed in the build environment. **Run `npm i -D @types/howler` and delete this file**
once you're on your own machine; the official types are more complete and supersede the shim.

### `src/components/ui/sound-toggle.tsx`
Header control. The speaker icon reflects mute state; opening the popover exposes a Mute toggle plus
Music and Effects volume sliders. Reads/writes the persisted store through `useAudio`, so choices
stick across refreshes. Placed in `src/common/Header.tsx` next to `ModeToggle`.

---

## 4. Where each sound is triggered

### Single-player quiz

| Event | Sound | File | Trigger |
| --- | --- | --- | --- |
| Answer graded | `correct` / `wrong` | `src/hooks/use-quiz-session.ts` | `handleAnswerSubmissionSuccess` — `Correct` → `correct`, else `wrong` |
| Final 5 seconds | `tick` | `src/pages/Quiz/Sessions/components/quiz-taking-process/quiz-timer.tsx` | countdown interval, when `next <= 5` |
| Results screen | `win` / `lose` | `src/pages/Quiz/Sessions/components/quiz-results/quiz-results.tsx` | mount effect; `win` if ≥ 50% correct, else `lose` |

### Multiplayer (live match)

| Event | Sound | File | Trigger |
| --- | --- | --- | --- |
| Player joins lobby | `join` | `src/pages/Quiz/Multiplayer/hooks/use-lobby-connection.ts` | `UserJoined` handler (skips your own join) |
| Match starting | `start` + `gameplay` music | `src/pages/Quiz/Multiplayer/hooks/use-match.ts` | `MatchStarting` handler |
| New question | `whoosh` | `use-match.ts` | `QuestionStarted` handler |
| You submit an answer | `lock` | `use-match.ts` | `submit()` |
| Reveal | `correct` / `wrong` | `use-match.ts` | `QuestionEnded` — looks up your username in `result.players` |
| Match ends | `win` / `lose` + music stops | `use-match.ts` | `MatchEnded` — `win` if you are `winnerUsername` |

`useMatch` now takes a `username` option (passed from `MultiplayerLobbyPage.tsx`) so it can pick the
right per-player sound. It's held in a ref so the once-bound SignalR handlers always see the latest value.

### App-wide wiring

| What | File |
| --- | --- |
| `AudioProvider` mounted | `src/Provider.tsx` (wraps `MultiplayerProvider`) |
| `SoundToggle` in header | `src/common/Header.tsx` |

---

## 5. How to use it in new code

In a React component:
```tsx
import { useAudio } from "@/lib/audio";

function Example() {
  const { play } = useAudio();
  return <button onClick={() => play("correct")}>Test sound</button>;
}
```

In a non-component callback (event handler, service, SignalR):
```ts
import { audio } from "@/lib/audio";

connection.on("SomeEvent", () => audio.play("whoosh"));
```

Background music:
```ts
audio.playMusic("gameplay"); // starts/curves in a loop
audio.stopMusic();            // fades out
```

---

## 6. Adding a new sound

1. Add an entry to `SFX` (or `MUSIC`) in `sounds.ts`. For a placeholder, build it with `makeTone`;
   for real audio, point it at a file:
   ```ts
   levelUp: () => "/audio/level-up.webm",
   ```
2. That's it — the key becomes a valid `SoundName`, and `play("levelUp")` works everywhere. TypeScript
   will autocomplete and type-check the name.

## 7. Replacing placeholders with real audio

1. Put files in `public/audio/` (they'll be served from the site root, e.g. `/audio/correct.webm`).
2. In `sounds.ts`, change each entry's return value to the file path. Prefer `.webm` with an `.mp3`
   fallback — Howler accepts an array: `correct: () => ["/audio/correct.webm", "/audio/correct.mp3"]`.
3. Keep total audio small (~1–2 MB); the files load lazily via Howler's `preload`.
4. Once everything sounds right, you can delete `generate-tone.ts` (nothing else imports it).

Good CC0 / royalty-free sources: Kenney (kenney.nl), freesound.org, Pixabay Music, Incompetech.

---

## 8. Preferences, persistence, and mute

- User choices persist under the `localStorage` key `oxygen-audio-prefs`.
- Muting sets `Howler.mute(true)` globally; the current music track is remembered and resumes on unmute.
- Volumes are independent for music vs. effects (`musicVolume`, `sfxVolume`, each `0..1`).

## 9. Test / SSR safety

`AudioManager.init()` returns early when `window` is undefined and wraps `Howl` creation in
`try/catch`, so sounds triggered during unit tests (jsdom, no Web Audio) or Storybook rendering are
harmless no-ops. No test changes were required.

## 10. Known follow-ups

- Install `@types/howler` and delete `howler-shim.d.ts` (see §3).
- Optional: add a lobby music bed (`MUSIC.lobby` already exists — call `audio.playMusic("lobby")`
  from the lobby mount and `stopMusic()` on leave/match start if you want it).
- Replace placeholder tones with real assets (§7).
- Run `graphify update .` after pulling these changes so the knowledge graph reflects the new module.

---

## 11. Dependency

- `howler` (`^2.2.4`) — added to `dependencies`.
- `@types/howler` — intended dev dependency; currently replaced by the local shim.
