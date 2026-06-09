import { Switch } from "@/components/ui";
import { Music } from "lucide-react";
import { UserSettings } from "@/types/settings-types";
import { Section, Row, VolumeSlider } from "./SharedPrimitives";

type AudioSectionProps = {
  form: UserSettings;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
};

export const AudioSection = ({ form, set }: AudioSectionProps) => {
  return (
    <Section icon={Music} title="Audio" description="Background music and sound effects.">
      <Row
        title="Background music"
        description="Play looped music while you browse."
        control={
          <Switch
            checked={form.musicEnabled}
            onCheckedChange={(v) => set("musicEnabled", v)}
          />
        }
      />
      <Row
        title="Music volume"
        dimmed={!form.musicEnabled}
        control={
          <VolumeSlider
            value={form.musicVolume}
            disabled={!form.musicEnabled}
            onChange={(v) => set("musicVolume", v)}
          />
        }
      />
      <Row
        title="Sound effects"
        description="Play sounds for quiz actions."
        control={
          <Switch
            checked={form.soundEffectsEnabled}
            onCheckedChange={(v) => set("soundEffectsEnabled", v)}
          />
        }
      />
      <Row
        title="Effects volume"
        dimmed={!form.soundEffectsEnabled}
        control={
          <VolumeSlider
            value={form.soundEffectsVolume}
            disabled={!form.soundEffectsEnabled}
            onChange={(v) => set("soundEffectsVolume", v)}
          />
        }
      />
    </Section>
  );
};