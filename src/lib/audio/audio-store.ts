/**
 * audio-store.ts
 * --------------
 * The ZUSTAND STORE for audio *preferences* — the small bag of "what the user wants":
 * muted?, how loud is music?, how loud are effects?. This is the same tiny state library used
 * by Notifications-store.ts.
 *
 * Two ideas:
 *   1. `persist` middleware saves these choices to localStorage, so a user's mute/volume
 *      survives a page refresh.
 *   2. Whenever a value changes, we also push it into the AudioManager singleton, so the
 *      "machine that makes noise" always matches the user's wishes. Store = intent,
 *      singleton = execution.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { audio } from "./AudioManager";

interface AudioPrefsStore {
  muted: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  /** Push all current prefs into the singleton (called once on app load). */
  sync: () => void;
}

export const useAudioStore = create<AudioPrefsStore>()(
  persist(
    (set, get) => ({
      muted: false,
      musicVolume: 0.4,
      sfxVolume: 0.8,

      setMuted: (muted) => {
        audio.setMuted(muted);
        set({ muted });
      },
      toggleMuted: () => get().setMuted(!get().muted),

      setMusicVolume: (v) => {
        audio.setMusicVolume(v);
        set({ musicVolume: v });
      },
      setSfxVolume: (v) => {
        audio.setSfxVolume(v);
        set({ sfxVolume: v });
      },

      sync: () => {
        const { muted, musicVolume, sfxVolume } = get();
        audio.setSfxVolume(sfxVolume);
        audio.setMusicVolume(musicVolume);
        audio.setMuted(muted);
      },
    }),
    { name: "oxygen-audio-prefs" }
  )
);
