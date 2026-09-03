import React from "react";
import {
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { UserSettings } from "@/types/settings-types";
import { FONT_OPTIONS } from "@/lib/fonts";
import { Section, Row } from "./SharedPrimitives";

const FontSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger variant="minimal" className="w-40">
      <SelectValue />
    </SelectTrigger>
    <SelectContent variant="minimal">
      {FONT_OPTIONS.map((f) => (
        <SelectItem key={f.value} variant="minimal" value={f.value}>
          <span style={{ fontFamily: f.value }}>{f.label}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

type TypographySectionProps = {
  form: UserSettings;
  setForm: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  syncFonts: boolean;
  setSyncFonts: (v: boolean) => void;
};

export const TypographySection = ({
  form,
  setForm,
  set,
  syncFonts,
  setSyncFonts,
}: TypographySectionProps) => {
  // Draft only. The live preview is applied from the draft in `useSettingsForm`, which is
  // what makes Discard revert it — writing the CSS variable from here left the browser on a
  // font the form had already thrown away.
  const setFont = (zone: "app" | "quiz", value: string) => {
    if (syncFonts) {
      setForm((prev) =>
        prev ? { ...prev, appFont: value, quizFont: value } : prev
      );
    } else {
      set(zone === "app" ? "appFont" : "quizFont", value);
    }
  };

  return (
    <Section>
      <Row
        title="Same font everywhere"
        control={
          <Switch
            size="sm"
            checked={syncFonts}
            onCheckedChange={(on) => {
              setSyncFonts(on);
              if (on && form) set("quizFont", form.appFont);
            }}
          />
        }
      />

      {syncFonts ? (
        <Row
          title="Font"
          control={
            <FontSelect
              value={form.appFont}
              onChange={(v) => setFont("app", v)}
            />
          }
        />
      ) : (
        <>
          <Row
            title="Dashboard font"
            control={
              <FontSelect
                value={form.appFont}
                onChange={(v) => setFont("app", v)}
              />
            }
          />
          <Row
            title="Quiz font"
            control={
              <FontSelect
                value={form.quizFont}
                onChange={(v) => setFont("quiz", v)}
              />
            }
          />
        </>
      )}
    </Section>
  );
};
