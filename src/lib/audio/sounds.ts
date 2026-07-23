/**
 * sounds.ts
 * ---------
 * The single registry of every sound in the app. Two groups:
 *   - SFX   : short one-shot effects (correct answer, tick, whoosh, ...)
 *   - MUSIC : looping background beds (lobby, gameplay)
 *
 * Right now every entry is a synthesized PLACEHOLDER tone (see generate-tone.ts) so audio
 * works with zero asset files. To ship real audio, just swap the value for a URL:
 *
 *     correct: "/audio/correct.webm",   // <-- put files in /public/audio
 *
 * Nothing else in the codebase needs to change — AudioManager loads whatever source it finds
 * here. Prefer .webm with an .mp3 fallback (Howler accepts an array: ["/a.webm", "/a.mp3"]).
 */

import { makeTone } from "./generate-tone";

// Musical note frequencies (Hz) for building the placeholder jingles.
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5,
} as const;

// ---- Sound effects -------------------------------------------------------
// Keys are the names you pass to `play("correct")`. Add/rename freely.
export const SFX = {
  // Correct answer: bright two-note rise.
  correct: () =>
    makeTone([
      { freq: N.C5, dur: 0.09, wave: "sine", vol: 0.5 },
      { freq: N.E5, dur: 0.14, wave: "sine", vol: 0.5 },
    ]),
  // Wrong / timed out: low descending buzz.
  wrong: () =>
    makeTone([
      { freq: N.E4, dur: 0.12, wave: "square", vol: 0.28 },
      { freq: N.C4, dur: 0.2, wave: "square", vol: 0.28 },
    ]),
  // Final-seconds countdown tick.
  tick: () => makeTone([{ freq: N.A4, dur: 0.05, wave: "sine", vol: 0.35 }]),
  // New question appears.
  whoosh: () => makeTone([{ freq: 0, dur: 0.16, wave: "noise", vol: 0.18 }]),
  // Your answer locked in.
  lock: () => makeTone([{ freq: N.G4, dur: 0.06, wave: "triangle", vol: 0.35 }]),
  // Another player joined the lobby.
  join: () =>
    makeTone([
      { freq: N.G4, dur: 0.07, wave: "sine", vol: 0.4 },
      { freq: N.C5, dur: 0.1, wave: "sine", vol: 0.4 },
    ]),
  // Match is starting (countdown sting).
  start: () =>
    makeTone([
      { freq: N.C5, dur: 0.1, wave: "triangle", vol: 0.4 },
      { freq: N.E5, dur: 0.1, wave: "triangle", vol: 0.4 },
      { freq: N.G5, dur: 0.18, wave: "triangle", vol: 0.4 },
    ]),
  // You / the quiz finished well — ascending fanfare.
  win: () =>
    makeTone([
      { freq: N.C5, dur: 0.1, wave: "sine", vol: 0.5 },
      { freq: N.E5, dur: 0.1, wave: "sine", vol: 0.5 },
      { freq: N.G5, dur: 0.1, wave: "sine", vol: 0.5 },
      { freq: N.C6, dur: 0.26, wave: "sine", vol: 0.5 },
    ]),
  // You lost / lower placement — gentle descending.
  lose: () =>
    makeTone([
      { freq: N.G4, dur: 0.14, wave: "sine", vol: 0.4 },
      { freq: N.E4, dur: 0.14, wave: "sine", vol: 0.4 },
      { freq: N.C4, dur: 0.28, wave: "sine", vol: 0.4 },
    ]),
} satisfies Record<string, () => string>;

// ---- Music beds (looping) ------------------------------------------------
// Placeholder loops are simple, quiet arpeggios. Swap for real tracks the same way.
export const MUSIC = {
  lobby: () =>
    makeTone([
      { freq: N.C4, dur: 0.4, wave: "sine", vol: 0.16 },
      { freq: N.E4, dur: 0.4, wave: "sine", vol: 0.16 },
      { freq: N.G4, dur: 0.4, wave: "sine", vol: 0.16 },
      { freq: N.E4, dur: 0.4, wave: "sine", vol: 0.16 },
    ]),
  gameplay: () =>
    makeTone([
      { freq: N.C4, dur: 0.3, wave: "triangle", vol: 0.14 },
      { freq: N.G4, dur: 0.3, wave: "triangle", vol: 0.14 },
      { freq: N.A4, dur: 0.3, wave: "triangle", vol: 0.14 },
      { freq: N.F4, dur: 0.3, wave: "triangle", vol: 0.14 },
    ]),
} satisfies Record<string, () => string>;

export type SoundName = keyof typeof SFX;
export type MusicName = keyof typeof MUSIC;
