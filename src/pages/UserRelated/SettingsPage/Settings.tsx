import { useEffect, useState } from "react";
import { Switch, LoadingWave, useTheme, Button } from "@/components/ui";
import { Timer, Bell, Lock } from "lucide-react";
import { useSettingsData } from "./api/get-settings";
import { useUpdateSettings } from "./api/update-settings";
import { UserSettings } from "@/types/settings-types";
import {
  normalizeFont,
  DEFAULT_APP_FONT,
  DEFAULT_QUIZ_FONT,
} from "@/lib/fonts";
import { Save } from "lucide-react";
// Modular feature imports
import { Section, Row } from "./components/SharedPrimitives";
import { AudioSection } from "./components/AudioSection";
import { AppearanceSection } from "./components/AppearanceSection";
import { TypographySection } from "./components/TypographySection";

export const Settings = () => {
  const { data, isLoading, isError } = useSettingsData();
  const updateSettings = useUpdateSettings();
  const { setTheme } = useTheme();

  const [form, setForm] = useState<UserSettings | null>(null);
  const [syncFonts, setSyncFonts] = useState(false);

  useEffect(() => {
    if (!data) return;
    const normalized: UserSettings = {
      ...data,
      appFont: normalizeFont(data.appFont, DEFAULT_APP_FONT),
      quizFont: normalizeFont(data.quizFont, DEFAULT_QUIZ_FONT),
    };
    setForm(normalized);
    setSyncFonts(normalized.appFont === normalized.quizFont);
  }, [data]);

  if (isLoading || !form) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingWave size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-center text-red-500 py-8">
        Failed to load settings. Please try again later.
      </p>
    );
  }

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const isDirty = !!data && JSON.stringify(form) !== JSON.stringify(data);

  const handleSave = () => {
    if (form) updateSettings.mutate(form);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your preferences. Changes are saved to your account.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty}
          isPending={updateSettings.isPending}
          className="text-white"
        >
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>

      {/* Audio Sub-section */}
      <AudioSection form={form} set={set} />

      {/* Appearance Sub-section */}
      <AppearanceSection form={form} set={set} setTheme={setTheme} />

      {/* Typography Sub-section */}
      <TypographySection
        form={form}
        setForm={setForm}
        set={set}
        syncFonts={syncFonts}
        setSyncFonts={setSyncFonts}
      />

      {/* Quiz */}
      <Section
        icon={Timer}
        title="Quiz"
        description="Defaults for taking quizzes."
      >
        <Row
          title="Show timer"
          description="Display the countdown while taking a quiz."
          control={
            <Switch
              checked={form.showTimer}
              onCheckedChange={(v) => set("showTimer", v)}
            />
          }
        />
        <Row
          title="Default difficulty"
          description="Pre-select a difficulty for new quizzes."
          soon
          dimmed
          control={<span className="text-sm text-muted-foreground">Any</span>}
        />
      </Section>

      {/* Notifications (placeholder) */}
      <Section
        icon={Bell}
        title="Notifications"
        description="Choose what we notify you about."
      >
        <Row
          title="Email notifications"
          description="Updates and summaries by email."
          soon
          dimmed
          control={<Switch checked={false} disabled />}
        />
        <Row
          title="Push notifications"
          description="In-app and browser alerts."
          soon
          dimmed
          control={<Switch checked={false} disabled />}
        />
      </Section>

      {/* Account (placeholder) */}
      <Section icon={Lock} title="Account" description="Security and sign-in.">
        <Row
          title="Change password"
          description="Update your account password."
          soon
          dimmed
          control={
            <button
              disabled
              className="rounded-lg border border-foreground/20 py-1.5 px-3 text-sm text-muted-foreground cursor-not-allowed"
            >
              Change
            </button>
          }
        />
      </Section>
    </div>
  );
};
