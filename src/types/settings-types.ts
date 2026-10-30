export type ThemePreference = "light" | "dark";

// Mirrors the backend SettingsDTO (camelCase over the wire).
export type UserSettings = {
  musicEnabled: boolean;
  musicVolume: number; // 0..100
  soundEffectsEnabled: boolean;
  soundEffectsVolume: number; // 0..100
  theme: ThemePreference;
  showTimer: boolean;
  /** Quiz builder: confirm before removing a question. Off after "Don't ask again". */
  askBeforeRemovingQuestion: boolean;
  appFont: string; // dashboard / UI body font family
  quizFont: string; // quiz experience font family
};
