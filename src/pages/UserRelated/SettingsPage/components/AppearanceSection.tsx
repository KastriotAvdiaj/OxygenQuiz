import { SegmentedControl } from "@/components/ui";
import { Palette } from "lucide-react";
import { ThemePreference, UserSettings } from "@/types/settings-types";
import { Section, Row } from "./SharedPrimitives";

type AppearanceSectionProps = {
  form: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  setTheme: (theme: ThemePreference) => void;
};

export const AppearanceSection = ({ form, set, setTheme }: AppearanceSectionProps) => {
  return (
    <Section icon={Palette} title="Appearance">
      <Row
        title="Theme"
        control={
          <SegmentedControl
            aria-label="Theme"
            value={form.theme}
            onValueChange={(v) => {
              const theme = v as ThemePreference;
              set("theme", theme);
              setTheme(theme);
            }}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        }
      />
      <Row
        title="Accent color"
        soon
        dimmed
        control={<span className="text-sm text-muted-foreground">Default</span>}
      />
    </Section>
  );
};
