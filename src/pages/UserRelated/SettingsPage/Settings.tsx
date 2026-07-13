import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Switch, LoadingWave, useTheme, Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Timer, Bell, Lock, Undo2 } from "lucide-react";
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

  // Dirty = the edited form differs from the server's copy. Guarded on both being
  // present so the brief "data loaded but form not yet normalized" render isn't dirty.
  const isDirty =
    !!data && !!form && JSON.stringify(form) !== JSON.stringify(data);

  // Block in-app navigation while there are unsaved changes; the dialog below offers
  // save / discard / stay. (Hook must run on every render, so it sits above the early returns.)
  const blocker = useBlocker(isDirty);

  // Warn on hard exits (tab close / refresh) too — the browser shows its own generic prompt.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

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

  const handleSave = (onSaved?: () => void) => {
    if (form) updateSettings.mutate(form, { onSuccess: () => onSaved?.() });
  };

  // Revert the form to the server's copy (re-normalized, same as the load effect).
  const handleDiscard = () => {
    if (!data) return;
    const normalized: UserSettings = {
      ...data,
      appFont: normalizeFont(data.appFont, DEFAULT_APP_FONT),
      quizFont: normalizeFont(data.quizFont, DEFAULT_QUIZ_FONT),
    };
    setForm(normalized);
    setSyncFonts(normalized.appFont === normalized.quizFont);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your preferences. Changes are saved to your account.
        </p>
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

      {/* Floating save bar — fixed to the viewport, slides in whenever there are
          unsaved changes so the save action is always reachable without scrolling. */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-primary border-dashed bg-background/95 backdrop-blur shadow-lg py-2 pl-5 pr-2">
              <span className="text-sm font-medium text-muted-foreground">
                You have unsaved changes
              </span>
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                <Undo2 className="h-4 w-4" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave()}
                isPending={updateSettings.isPending}
                className="text-white rounded-full"
              >
                <Save className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave-page guard: shown when in-app navigation is blocked by unsaved changes. */}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You've made changes to your settings that haven't been saved yet.
            Save them before leaving, or discard them?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stay here
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDiscard();
                blocker.proceed?.();
              }}
            >
              Discard & leave
            </Button>
            <Button
              onClick={() => handleSave(() => blocker.proceed?.())}
              isPending={updateSettings.isPending}
              className="text-white"
            >
              <Save className="h-4 w-4" />
              Save & leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
