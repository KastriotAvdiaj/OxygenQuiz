import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
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
    <Section icon={Palette} title="Appearance" description="How the app looks.">
      <Row
        title="Theme"
        description="Light or dark."
        control={
          <Select
            value={form.theme}
            onValueChange={(v) => {
              const theme = v as ThemePreference;
              set("theme", theme);
              setTheme(theme);
            }}
          >
            <SelectTrigger variant="quiz" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="quiz">
              <SelectItem variant="quiz" value="light">Light</SelectItem>
              <SelectItem variant="quiz" value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Row
        title="Accent color"
        description="Personalize the primary color."
        soon
        dimmed
        control={<span className="text-sm text-muted-foreground">Default</span>}
      />
    </Section>
  );
};