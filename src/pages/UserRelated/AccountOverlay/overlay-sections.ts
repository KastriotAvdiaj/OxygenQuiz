import {
  CircleUser,
  Trophy,
  Palette,
  Type,
  Volume2,
  Timer,
  Bell,
} from "lucide-react";

/**
 * The overlay's navigation model, in render order.
 *
 * Single source of truth: the sidebar, the mobile menu list, the panel switch and the
 * URL validation all read this list, so adding a section is a one-line change and an
 * unknown `?settings=` value can be rejected without a second lookup table.
 *
 * Icons come from the same lucide outline family as DashboardNav and the account
 * drawer — one icon system across every navigation surface.
 */
export const ACCOUNT_OVERLAY_SECTIONS = [
  {
    id: "account",
    label: "My Account",
    icon: CircleUser,
    group: "User",
  },
  {
    id: "stats",
    label: "Quiz Stats",
    icon: Trophy,
    group: "User",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    group: "App Settings",
  },
  {
    id: "typography",
    label: "Typography",
    icon: Type,
    group: "App Settings",
  },
  {
    id: "audio",
    label: "Audio",
    icon: Volume2,
    group: "App Settings",
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: Timer,
    group: "App Settings",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    group: "App Settings",
  },
] as const;

export type OverlaySectionId = (typeof ACCOUNT_OVERLAY_SECTIONS)[number]["id"];

export const DEFAULT_SECTION: OverlaySectionId = "account";

/** Sentinel value meaning "open, but no section chosen yet" — the mobile menu view. */
export const MENU_SECTION = "menu";

export const isOverlaySection = (value: string | null): value is OverlaySectionId =>
  !!value && ACCOUNT_OVERLAY_SECTIONS.some((section) => section.id === value);

/** Sections grouped for rendering, preserving first-seen group order. */
export const overlaySectionGroups = (): {
  name: string;
  items: (typeof ACCOUNT_OVERLAY_SECTIONS)[number][];
}[] => {
  const order: string[] = [];
  const byName = new Map<string, (typeof ACCOUNT_OVERLAY_SECTIONS)[number][]>();

  for (const section of ACCOUNT_OVERLAY_SECTIONS) {
    if (!byName.has(section.group)) {
      byName.set(section.group, []);
      order.push(section.group);
    }
    byName.get(section.group)!.push(section);
  }

  return order.map((name) => ({ name, items: byName.get(name)! }));
};
