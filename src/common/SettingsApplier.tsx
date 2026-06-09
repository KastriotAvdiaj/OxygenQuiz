import { useEffect, useRef } from "react";
import { useUser } from "@/lib/Auth";
import { useTheme } from "@/components/ui";
import { applyFont } from "@/lib/fonts";
import { useSettingsData } from "@/pages/UserRelated/SettingsPage/api/get-settings";

// Drop a real audio file here (public/audio/background-music.mp3).
const MUSIC_SRC = "/audio/background-music.mp3";

/**
 * Applies the logged-in user's saved settings app-wide:
 *  - syncs the theme preference to the ThemeProvider
 *  - drives a looped background-music <audio> element (volume + play/pause)
 *
 * Mounted once near the app root. Renders only a hidden <audio> element.
 */
export const SettingsApplier = () => {
  const user = useUser();
  const isAuthed = !!user.data;

  // Only fetch settings for authenticated users (avoids a 401 for guests).
  const { data: settings } = useSettingsData({ enabled: isAuthed });

  const { setTheme } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync the saved theme whenever it changes.
  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme);
    // setTheme is stable in behavior (useState bails on equal values).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme]);

  // Apply the saved fonts to their CSS variables (app + quiz zones).
  useEffect(() => {
    if (settings?.appFont) applyFont("app", settings.appFont);
  }, [settings?.appFont]);

  useEffect(() => {
    if (settings?.quizFont) applyFont("quiz", settings.quizFont);
  }, [settings?.quizFont]);

  // Apply music preference: volume, then play or pause.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = (settings?.musicVolume ?? 50) / 100;

    if (isAuthed && settings?.musicEnabled) {
      // Browsers block autoplay-with-sound until a user gesture; retry on the
      // first interaction if the initial attempt is rejected.
      const tryPlay = () => audio.play().catch(() => {});
      tryPlay();

      const onInteract = () => {
        tryPlay();
        window.removeEventListener("pointerdown", onInteract);
        window.removeEventListener("keydown", onInteract);
      };
      window.addEventListener("pointerdown", onInteract);
      window.addEventListener("keydown", onInteract);

      return () => {
        window.removeEventListener("pointerdown", onInteract);
        window.removeEventListener("keydown", onInteract);
      };
    }

    audio.pause();
  }, [isAuthed, settings?.musicEnabled, settings?.musicVolume]);

  return <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />;
};
