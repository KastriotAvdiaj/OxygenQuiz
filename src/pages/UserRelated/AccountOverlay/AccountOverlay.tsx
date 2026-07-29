import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, Save, Undo2, LogOut } from "lucide-react";
import { Button, LoadingWave } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import { useUser, useLogout } from "@/lib/Auth";
import { useSettingsForm } from "@/pages/UserRelated/SettingsPage/useSettingsForm";
import { useAccountOverlay } from "./use-account-overlay";
import {
  ACCOUNT_OVERLAY_SECTIONS,
  MENU_SECTION,
  OverlaySectionId,
  overlaySectionGroups,
} from "./overlay-sections";
import { AccountPanel } from "./panels/AccountPanel";
import { StatsPanel } from "./panels/StatsPanel";
import {
  AppearancePanel,
  AudioPanel,
  NotificationsPanel,
  QuizPanel,
  TypographyPanel,
} from "./panels/SettingsPanels";

const sectionLabel = (id: OverlaySectionId) =>
  ACCOUNT_OVERLAY_SECTIONS.find((s) => s.id === id)?.label ?? "";

/** Sections whose content is part of the settings draft (so they get the save bar). */
const SETTINGS_SECTIONS: OverlaySectionId[] = [
  "appearance",
  "typography",
  "audio",
  "quiz",
  "notifications",
];

/**
 * A navigation row shared by the desktop sidebar and the mobile menu list. Same visual
 * language as DashboardNav and the account drawer: 18px lucide icon, muted label that
 * lifts on hover, muted pill plus a 3px primary bar when active.
 */
const SectionButton = ({
  section,
  isActive,
  showChevron,
  onSelect,
}: {
  section: (typeof ACCOUNT_OVERLAY_SECTIONS)[number];
  isActive: boolean;
  showChevron?: boolean;
  onSelect: () => void;
}) => {
  const Icon = section.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      // min-h-11 (44px): comfortable touch target per docs/RESPONSIVE.md.
      className={cn(
        "group relative flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left outline-none transition-colors",
        "focus-visible:ring-1 focus-visible:ring-ring",
        !isActive && "hover:bg-muted/60",
      )}
    >
      {isActive && (
        <>
          <span className="absolute inset-0 rounded-lg bg-muted" />
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
        </>
      )}
      <Icon
        size={18}
        strokeWidth={1.75}
        className={cn(
          "relative z-10 h-[18px] w-[18px] shrink-0 transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span
        className={cn(
          "relative z-10 ml-3 flex-1 truncate text-[13px] font-medium transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {section.label}
      </span>
      {showChevron && (
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="relative z-10 shrink-0 text-muted-foreground"
        />
      )}
    </button>
  );
};

const SectionNav = ({
  activeSection,
  showChevrons,
  onSelect,
  onLogout,
}: {
  activeSection: OverlaySectionId | null;
  showChevrons?: boolean;
  onSelect: (id: OverlaySectionId) => void;
  onLogout: () => void;
}) => (
  <nav aria-label="Account settings" className="flex flex-col gap-4">
    {overlaySectionGroups().map((group) => (
      <div key={group.name}>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {group.name}
        </p>
        <div className="space-y-0.5">
          {group.items.map((section) => (
            <SectionButton
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              showChevron={showChevrons}
              onSelect={() => onSelect(section.id)}
            />
          ))}
        </div>
      </div>
    ))}

    <div className="border-t border-border pt-2">
      <button
        type="button"
        onClick={onLogout}
        className="group flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-muted-foreground outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
        <span className="ml-3 text-[13px] font-medium">Log out</span>
      </button>
    </div>
  </nav>
);

/**
 * Discord-style account overlay: navigation on the left, one panel on the right.
 *
 * Two shells, one set of panels (the pattern docs/RESPONSIVE.md prescribes for
 * sidebars):
 * - **≥ md**: two panes side by side, sidebar always visible.
 * - **< md**: a drill-down. `?settings=menu` shows the list full-screen; picking a
 *   section swaps to that panel with a back arrow. Trying to fit a 220px sidebar and a
 *   content pane onto a 360px screen leaves neither usable.
 *
 * Sizing follows the doc: `dvh` (never `vh`) so mobile browser chrome doesn't push the
 * footer off-screen, an inner `overflow-y-auto` so long panels scroll instead of
 * growing the dialog, and safe-area padding for the home indicator.
 */
export const AccountOverlay = () => {
  const { isOpen, section, resolvedSection, goToSection, close } =
    useAccountOverlay();
  const { data: user } = useUser();
  const logout = useLogout();
  const settings = useSettingsForm();

  const isMenuView = section === MENU_SECTION;
  const activeSection = resolvedSection;
  const isSettingsSection = SETTINGS_SECTIONS.includes(activeSection);
  const showSaveBar = isOpen && isSettingsSection && settings.isDirty;

  // Block navigation (including closing the overlay) while the settings draft is dirty.
  // This is exactly why the overlay is URL-driven: close is a navigation, so the same
  // guard that protected the old standalone page still applies here, unchanged.
  const blocker = useBlocker(settings.isDirty);

  // Hard exits (tab close / refresh) get the browser's own generic prompt.
  useEffect(() => {
    if (!settings.isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [settings.isDirty]);

  // Signing out mid-edit shouldn't trip the unsaved-changes guard.
  const handleLogout = () => {
    settings.discard();
    logout.mutate({});
    close();
  };

  if (!isOpen || !user) return null;

  const renderPanel = () => {
    if (activeSection === "account") return <AccountPanel />;
    if (activeSection === "stats") return <StatsPanel />;

    // Every remaining section reads the settings draft, so wait for it to load.
    if (settings.isError)
      return (
        <p className="py-8 text-center text-sm text-destructive">
          Failed to load settings. Please try again later.
        </p>
      );
    if (!settings.form)
      return (
        <div className="flex justify-center py-10">
          <LoadingWave size="sm" />
        </div>
      );

    const props = { settings: { ...settings, form: settings.form } };
    switch (activeSection) {
      case "appearance":
        return <AppearancePanel {...props} />;
      case "typography":
        return <TypographyPanel {...props} />;
      case "audio":
        return <AudioPanel {...props} />;
      case "quiz":
        return <QuizPanel {...props} />;
      case "notifications":
        return <NotificationsPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Built on Radix primitives rather than the shadcn <DialogContent> wrapper: that
          wrapper hardcodes its own absolutely-positioned close button (which would sit
          on top of this header's) plus padding and a max-width tuned for small dialogs. */}
      <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            // Phone: edge-to-edge and full height, like a native screen. Desktop: a
            // centred panel capped so it never touches the viewport edges.
            // The dvh pair is the fallback form docs/RESPONSIVE.md requires.
            className={cn(
              "fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-background text-foreground shadow-lg outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "h-[100vh] w-screen supports-[height:100dvh]:h-[100dvh]",
              "sm:h-[calc(100vh-4rem)] sm:w-[calc(100vw-4rem)] sm:max-w-5xl sm:rounded-xl sm:border sm:border-border",
              "sm:supports-[height:100dvh]:h-[calc(100dvh-4rem)]",
            )}
          >
          {/* Radix requires an accessible title; ours is visual, per-pane. */}
          <DialogPrimitive.Title className="sr-only">
            Account and settings
          </DialogPrimitive.Title>

          {/* ── Sidebar: always on ≥md, and on phones only in the menu view ── */}
          <aside
            className={cn(
              "shrink-0 overflow-y-auto border-border bg-background p-3",
              "md:block md:w-60 md:border-r",
              isMenuView ? "block w-full" : "hidden",
            )}
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-3 flex items-center justify-between px-2 md:hidden">
              <p className="text-base font-semibold">Settings</p>
            </div>
            <SectionNav
              activeSection={isMenuView ? null : activeSection}
              showChevrons={isMenuView}
              onSelect={goToSection}
              onLogout={handleLogout}
            />
          </aside>

          {/* ── Content pane ── */}
          <div
            className={cn(
              "min-w-0 flex-1 flex-col bg-background",
              isMenuView ? "hidden md:flex" : "flex",
            )}
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-6">
              {/* Back is the phone's way out of a panel; hidden once the sidebar exists. */}
              <button
                type="button"
                onClick={() => goToSection(MENU_SECTION)}
                aria-label="Back to settings menu"
                className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              >
                <ChevronLeft size={20} strokeWidth={1.75} />
              </button>

              <h2 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">
                {sectionLabel(activeSection)}
              </h2>

              <button
                type="button"
                onClick={close}
                aria-label="Close settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </header>

            {/* The pane owns the scrollbar — the dialog itself never grows. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
              <div className="mx-auto w-full max-w-2xl">{renderPanel()}</div>
            </div>

            {/* Save bar: sticky to the bottom of the pane rather than fixed to the
                viewport, so it stays inside the dialog and clears the home indicator. */}
            <AnimatePresence>
              {showSaveBar && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-6"
                  style={{
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                  }}
                >
                  <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">
                      You have unsaved changes
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={settings.discard}
                      >
                        <Undo2 className="h-4 w-4" />
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-white sm:flex-none"
                        isPending={settings.isSaving}
                        onClick={() => settings.save()}
                      >
                        <Save className="h-4 w-4" />
                        Save changes
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Leave guard: shown when a navigation (including closing) is blocked. */}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent className="max-w-[85vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You've made changes to your settings that haven't been saved yet. Save them
            before leaving, or discard them?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stay here
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                settings.discard();
                blocker.proceed?.();
              }}
            >
              Discard & leave
            </Button>
            <Button
              className="text-white"
              isPending={settings.isSaving}
              onClick={() => settings.save(() => blocker.proceed?.())}
            >
              <Save className="h-4 w-4" />
              Save & leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
