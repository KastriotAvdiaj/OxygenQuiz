/**
 * useAudio.ts
 * -----------
 * The friendly front door for React components. A hook is just a function that lets a
 * component tap into shared logic. `useAudio()` bundles the two things a component usually
 * wants: the play functions (from the singleton) and the live preference values + setters
 * (from the Zustand store, so the component re-renders when e.g. `muted` flips).
 *
 *   const { play, playMusic, muted, toggleMuted } = useAudio();
 *   <button onClick={() => play("correct")}>Test</button>
 *
 * Note: for firing sounds inside non-component callbacks (e.g. SignalR handlers) you don't
 * need this hook — just `import { audio } from "@/lib/audio"` and call `audio.play(...)`.
 */

import { audio } from "./AudioManager";
import { useAudioStore } from "./audio-store";
import type { SoundName, MusicName } from "./sounds";

export function useAudio() {
  const muted = useAudioStore((s) => s.muted);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const setMuted = useAudioStore((s) => s.setMuted);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);

  return {
    // actions (delegate straight to the singleton)
    play: (name: SoundName) => audio.play(name),
    playMusic: (name: MusicName) => audio.playMusic(name),
    stopMusic: () => audio.stopMusic(),
    unlock: () => audio.unlock(),
    // live preference state
    muted,
    musicVolume,
    sfxVolume,
    // setters
    setMuted,
    toggleMuted,
    setMusicVolume,
    setSfxVolume,
  };
}
