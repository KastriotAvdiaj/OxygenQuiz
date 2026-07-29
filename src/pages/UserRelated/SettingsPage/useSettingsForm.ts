import { useEffect, useState } from "react";
import { useSettingsData } from "./api/get-settings";
import { useUpdateSettings } from "./api/update-settings";
import { UserSettings } from "@/types/settings-types";
import {
  normalizeFont,
  DEFAULT_APP_FONT,
  DEFAULT_QUIZ_FONT,
} from "@/lib/fonts";

/**
 * All settings-form state in one place: the draft copy, dirty tracking, save and
 * discard.
 *
 * Extracted from the old standalone Settings page so the account overlay can own the
 * state at shell level while rendering only one section at a time. Without this, each
 * section would need its own copy of the draft and "unsaved changes" could only ever
 * mean "unsaved changes in the section you happen to be looking at".
 */
export const useSettingsForm = () => {
  const { data, isLoading, isError } = useSettingsData();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<UserSettings | null>(null);
  const [syncFonts, setSyncFonts] = useState(false);

  // Fonts are normalized on the way in so a legacy/unknown stored value doesn't read
  // as "dirty" the instant the form loads.
  const normalize = (settings: UserSettings): UserSettings => ({
    ...settings,
    appFont: normalizeFont(settings.appFont, DEFAULT_APP_FONT),
    quizFont: normalizeFont(settings.quizFont, DEFAULT_QUIZ_FONT),
  });

  useEffect(() => {
    if (!data) return;
    const normalized = normalize(data);
    setForm(normalized);
    setSyncFonts(normalized.appFont === normalized.quizFont);
  }, [data]);

  // Dirty = the edited form differs from the server's copy. Guarded on both being
  // present so the brief "data loaded but form not yet normalized" render isn't dirty.
  const isDirty =
    !!data && !!form && JSON.stringify(form) !== JSON.stringify(data);

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = (onSaved?: () => void) => {
    if (form) updateSettings.mutate(form, { onSuccess: () => onSaved?.() });
  };

  /** Revert the draft to the server's copy (re-normalized, same as the load effect). */
  const discard = () => {
    if (!data) return;
    const normalized = normalize(data);
    setForm(normalized);
    setSyncFonts(normalized.appFont === normalized.quizFont);
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
