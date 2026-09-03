import { useEffect, useMemo, useState } from "react";
import { useSettingsData } from "./api/get-settings";
import { useUpdateSettings } from "./api/update-settings";
import { useUser } from "@/lib/Auth";
import { UserSettings } from "@/types/settings-types";
import {
  applyFont,
  normalizeFont,
  DEFAULT_APP_FONT,
  DEFAULT_QUIZ_FONT,
} from "@/lib/fonts";

// Fonts are normalized on the way in so a legacy/unknown stored value (an empty string, a
// face that has since left FONT_OPTIONS) doesn't read as "dirty" the instant the form loads.
const normalize = (settings: UserSettings): UserSettings => ({
  ...settings,
  appFont: normalizeFont(settings.appFont, DEFAULT_APP_FONT),
  quizFont: normalizeFont(settings.quizFont, DEFAULT_QUIZ_FONT),
});

/**
 * All settings-form state in one place: the draft copy, dirty tracking, the live font
 * preview, save and discard.
 *
 * Extracted from the old standalone Settings page so the account overlay can own the
 * state at shell level while rendering only one section at a time. Without this, each
 * section would need its own copy of the draft and "unsaved changes" could only ever
 * mean "unsaved changes in the section you happen to be looking at".
 */
export const useSettingsForm = () => {
  // `GET /api/settings` is [Authorize]'d, and this hook runs wherever the account overlay is
  // mounted — which is `layout.tsx`, i.e. every route including the public home page. The
  // overlay's own `if (!user)` check happens *after* this call (hooks can't be conditional), so
  // without this guard an anonymous visitor still fires the request and takes a 401.
  const { data: user } = useUser();
  const { data, isLoading, isError } = useSettingsData({ enabled: !!user });
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<UserSettings | null>(null);
  const [syncFonts, setSyncFonts] = useState(false);

  // The server's copy, kept in the same shape as the draft. Dirty tracking has to compare
  // like with like: comparing the normalized draft against the *raw* response made any row
  // normalize() rewrites read as dirty from the moment it loaded, which pinned the save bar
  // open and left `useBlocker` refusing every navigation in the app — the whole UI stopped
  // responding to clicks that go anywhere.
  const saved = useMemo(() => (data ? normalize(data) : null), [data]);

  // Load (and reload after a save) the draft from the server's copy. Clearing it when the
  // settings query has no data matters on logout: a draft left behind would keep previewing
  // the previous account's fonts over the defaults.
  useEffect(() => {
    setForm(saved);
    if (saved) setSyncFonts(saved.appFont === saved.quizFont);
  }, [saved]);

  const isDirty = !!saved && !!form && JSON.stringify(form) !== JSON.stringify(saved);

  // The font preview lives in a CSS variable on <html> — state React doesn't own, so keeping
  // it in step with the draft is a real Effect.
  //
  // It hangs off the draft on purpose, so the draft is the single writer: the Typography
  // section only sets state, this puts it on the document, and **discard puts the saved value
  // back**. The section used to call `applyFont()` itself, which meant nothing ever wrote the
  // old font back — abandoning an edit left the new font on screen until a reload, on a page
  // that was still storing (and showing in the Select) the old one.
  const appFont = form?.appFont;
  useEffect(() => {
    if (appFont) applyFont("app", appFont);
  }, [appFont]);

  const quizFont = form?.quizFont;
  useEffect(() => {
    if (quizFont) applyFont("quiz", quizFont);
  }, [quizFont]);

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = (onSaved?: () => void) => {
    if (form) updateSettings.mutate(form, { onSuccess: () => onSaved?.() });
  };

  /** Revert the draft — and with it the font preview — to the server's copy. */
  const discard = () => {
    if (!saved) return;
    setForm(saved);
    setSyncFonts(saved.appFont === saved.quizFont);
  };

  return {
    form,
    setForm,
    set,
    syncFonts,
    setSyncFonts,
    isDirty,
    isLoading,
    isError,
    isSaving: updateSettings.isPending,
    save,
    discard,
  };
};

export type SettingsFormApi = ReturnType<typeof useSettingsForm>;
