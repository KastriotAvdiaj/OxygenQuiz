/**
 * AudioManager.ts
 * ---------------
 * THE SINGLETON. One instance (`audio`, exported at the bottom) owns every sound object for
 * the whole app. It lives OUTSIDE React, which is exactly what we want:
 *   - Sounds are created once, never duplicated by component re-renders.
 *   - Any code can make noise — React components AND plain callbacks like SignalR handlers —
 *     by importing `audio` and calling `audio.play("correct")`.
 *
 * It knows nothing about the UI. User preferences (mute / volumes) live in the Zustand store
 * (audio-store.ts), which pushes changes down here via setMuted / setSfxVolume / setMusicVolume.
 *
 * Browser autoplay policy: audio stays silent until the user interacts with the page. Howler
 * auto-unlocks on the first gesture; `unlock()` lets us also force it from an explicit click.
 */

import { Howl, Howler } from "howler";
import { SFX, MUSIC, type SoundName, type MusicName } from "./sounds";

class AudioManager {
  private sfx = new Map<SoundName, Howl>();
  private music = new Map<MusicName, Howl>();
  private currentMusic: MusicName | null = null;
  private muted = false;
  private sfxVolume = 0.8;
  private musicVolume = 0.4;
  private initialized = false;

  /**
   * Build every Howl once. Cheap to call repeatedly — guarded so it only runs the first time.
   * Called by AudioProvider on mount.
   */
  init() {
    if (this.initialized) return;
    // Skip in non-browser / test environments (jsdom has no Web Audio) so sounds triggered
    // during unit tests or Storybook rendering are harmless no-ops.
    if (typeof window === "undefined") return;
    this.initialized = true;

    try {
      (Object.keys(SFX) as SoundName[]).forEach((name) => {
        this.sfx.set(
          name,
          new Howl({ src: [SFX[name]()], volume: this.sfxVolume, preload: true })
        );
      });

      (Object.keys(MUSIC) as MusicName[]).forEach((name) => {
        this.music.set(
          name,
          new Howl({ src: [MUSIC[name]()], loop: true, volume: this.musicVolume, preload: true })
        );
      });
    } catch {
      /* audio unavailable in this environment; play() calls become no-ops */
    }
  }

  /** Force the audio context to resume — safe to call from a user-gesture handler. */
  unlock() {
    try {
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        void Howler.ctx.resume();
      }
    } catch {
      /* no-op: unlocking is best-effort */
    }
  }

  /** Play a one-shot effect. No-op while muted. */
  play(name: SoundName) {
    if (this.muted) return;
    this.init();
    this.sfx.get(name)?.play();
  }

  /** Start (or switch to) a looping music bed, cross-fading from any current track. */
  playMusic(name: MusicName) {
    this.init();
    if (this.currentMusic === name) return;
    this.stopMusic();
    this.currentMusic = name;
    if (this.muted) return; // remembered as current; will start when unmuted
    const track = this.music.get(name);
    if (!track) return;
    track.volume(0);
    const id = track.play();
    track.fade(0, this.musicVolume, 600, id);
  }

  /** Stop the current music bed with a short fade. */
  stopMusic() {
    if (!this.currentMusic) return;
    const track = this.music.get(this.currentMusic);
    this.currentMusic = null;
    if (!track) return;
    track.fade(track.volume(), 0, 400);
    // stop shortly after the fade completes
    window.setTimeout(() => track.stop(), 450);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
    // Resume the remembered track when unmuting.
    if (!muted && this.currentMusic) {
      const remembered = this.currentMusic;
      this.currentMusic = null;
      this.playMusic(remembered);
    }
  }

  setSfxVolume(vol: number) {
    this.sfxVolume = vol;
    this.sfx.forEach((h) => h.volume(vol));
  }

  setMusicVolume(vol: number) {
    this.musicVolume = vol;
    if (this.currentMusic) this.music.get(this.currentMusic)?.volume(vol);
  }
}

/** The one and only instance. Import this anywhere to make sound. */
export const audio = new AudioManager();
