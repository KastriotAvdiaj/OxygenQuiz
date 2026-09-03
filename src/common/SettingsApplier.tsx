import { useEffect, useRef } from "react";
import { useUser } from "@/lib/Auth";
import { useTheme } from "@/components/ui";
import {
  applyFont,
  normalizeFont,
  DEFAULT_APP_FONT,
  DEFAULT_QUIZ_FONT,
} from "@/lib/fonts";
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

  // Apply the fonts to their CSS variables (app + quiz zones).
  //
  // Unconditional, including when there is no saved preference — that is the whole
  // point. This used to read `if (settings?.appFont)`, so "no preference" meant "don't
  // touch the variable" and `DEFAULT_APP_FONT` was never actually applied: it only fed
  // the Settings <Select>. Which is how it came to say "Baloo 2" while `:root` said
  // "Noto Sans" without anyone noticing, and how saving that page could silently change
  // a user's font to one they never picked.
  //
  // Applying the constant makes it the single authority for "the default app font", and
  // demotes `:root` in global.css to what it should be — a first-paint fallback for the
  // moment before this runs. `src/lib/__tests__/font-defaults.test.ts` asserts the two
  // still agree, because two declarations of one fact don't stay equal on their own.
  //
  // Normalized on the way out for the same reason the settings draft normalizes on the way
  // in: a stored `""` (an old row backfilled with one) is not null, so `??` would let it
  // through and set the variable to nothing. The two have to agree about what an unusable
  // stored value means, or the font you see depends on which of them mounted last.
  useEffect(() => {
    applyFont("app", normalizeFont(settings?.appFont, DEFAULT_APP_FONT));
  }, [settings?.appFont]);

  useEffect(() => {
    applyFont("quiz", normalizeFont(settings?.quizFont, DEFAULT_QUIZ_FONT));
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
