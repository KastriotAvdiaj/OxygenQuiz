import { Switch } from "@/components/ui";
import { useTheme } from "@/components/ui";
import { Section, Row } from "@/pages/UserRelated/SettingsPage/components/SharedPrimitives";
import { AudioSection } from "@/pages/UserRelated/SettingsPage/components/AudioSection";
import { AppearanceSection } from "@/pages/UserRelated/SettingsPage/components/AppearanceSection";
import { TypographySection } from "@/pages/UserRelated/SettingsPage/components/TypographySection";
import type { SettingsFormApi } from "@/pages/UserRelated/SettingsPage/useSettingsForm";
import type { UserSettings } from "@/types/settings-types";

/**
 * The settings sections, each rendered on its own overlay panel.
 *
 * They take the shared form API as a prop rather than calling `useSettingsForm`
 * themselves: the overlay owns one draft, so "unsaved changes" means the same thing no
 * matter which section you're looking at, and switching sections never loses edits.
 */
type PanelProps = { settings: SettingsFormApi & { form: UserSettings } };

export const AppearancePanel = ({ settings }: PanelProps) => {
  const { setTheme } = useTheme();
  return <AppearanceSection form={settings.form} set={settings.set} setTheme={setTheme} />;
};

export const TypographyPanel = ({ settings }: PanelProps) => (
  <TypographySection
    form={settings.form}
    setForm={settings.setForm}
    set={settings.set}
    syncFonts={settings.syncFonts}
    setSyncFonts={settings.setSyncFonts}
  />
);

export const AudioPanel = ({ settings }: PanelProps) => (
  <AudioSection form={settings.form} set={settings.set} />
);

export const QuizPanel = ({ settings }: PanelProps) => (
  <Section>
    <Row
      title="Show timer"
      control={
        <Switch
          size="sm"
          checked={settings.form.showTimer}
          onCheckedChange={(v) => settings.set("showTimer", v)}
        />
      }
    />
    <Row
      title="Default difficulty"
      soon
      dimmed
      control={<span className="text-sm text-muted-foreground">Any</span>}
    />
  </Section>
);

export const NotificationsPanel = () => (
  <Section>
    <Row
      title="Email notifications"
      soon
      dimmed
      control={<Switch size="sm" checked={false} disabled />}
    />
    <Row
      title="Push notifications"
      soon
      dimmed
      control={<Switch size="sm" checked={false} disabled />}
    />
  </Section>
);
