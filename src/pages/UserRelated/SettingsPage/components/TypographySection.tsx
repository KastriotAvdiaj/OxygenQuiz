import React from "react";
import { Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Type } from "lucide-react";
import { UserSettings } from "@/types/settings-types";
import { FONT_OPTIONS, applyFont } from "@/lib/fonts";
import { Section, Row } from "./SharedPrimitives";

const FontSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger variant="quiz" className="w-44">
      <SelectValue />
    </SelectTrigger>
    <SelectContent variant="quiz">
      {FONT_OPTIONS.map((f) => (
        <SelectItem key={f.value} variant="quiz" value={f.value}>
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
  const setFont = (zone: "app" | "quiz", value: string) => {
    if (syncFonts) {
      setForm((prev) =>
        prev ? { ...prev, appFont: value, quizFont: value } : prev
      );
      applyFont("app", value);
      applyFont("quiz", value);
    } else {
      set(zone === "app" ? "appFont" : "quizFont", value);
      applyFont(zone, value);
    }
  };

  return (
    <Section
      icon={Type}
      title="Typography"
      description="Choose fonts for the app and the quiz experience."
    >
      <Row
        title="Use one font everywhere"
        description="Apply the same font to the dashboard and quizzes."
        control={
          <Switch
            checked={syncFonts}
            onCheckedChange={(on) => {
              setSyncFonts(on);
              if (on && form) {
                set("quizFont", form.appFont);
                applyFont("quiz", form.appFont);
              }
            }}
          />
        }
      />

      {syncFonts ? (
        <Row
          title="Font"
          description="Used across the whole app."
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
            description="Used across the dashboard and menus."
            control={
              <FontSelect
                value={form.appFont}
                onChange={(v) => setFont("app", v)}
              />
            }
          />
          <Row
            title="Quiz font"
            description="Used while taking and browsing quizzes."
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