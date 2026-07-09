import { useUser } from "@/lib/Auth";
import { useTheme } from "@/components/ui/theme-provider";
import { ThemePreference } from "@/types/settings-types";
import { useSettingsData } from "@/pages/UserRelated/SettingsPage/api/get-settings";
import { useUpdateSettings } from "@/pages/UserRelated/SettingsPage/api/update-settings";

/**
 * Single source of truth for changing the theme. Applies it instantly (local,
 * via ThemeProvider) and, for authenticated users, persists it to their saved
 * settings so the quick toggle and the Settings page stay in sync. Guests just
 * get the local change (no server call).
 */
export const useThemeSetting = () => {
  const { theme, setTheme } = useTheme();
  const user = useUser();
  const isAuthed = !!user.data;

  const { data: settings } = useSettingsData({ enabled: isAuthed });
  const updateSettings = useUpdateSettings();

  const changeTheme = (next: ThemePreference) => {
    setTheme(next); // instant, local
    if (isAuthed && settings) {
      updateSettings.mutate({ ...settings, theme: next });
    }
  };

  return { theme, changeTheme };
};
