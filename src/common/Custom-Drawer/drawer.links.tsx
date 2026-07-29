import { NavLink } from "react-router-dom";
// Uniform lucide outline set at a single stroke weight — the same rule dashboardNavConfig
// follows. The drawer previously mixed three react-icons families (filled glyphs) with one
// lucide icon, which is why it read as a different, less finished surface.
import {
  CircleUser,
  Users,
  Settings,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAccountOverlay } from "@/pages/UserRelated/AccountOverlay/use-account-overlay";
import type { OverlaySectionId } from "@/pages/UserRelated/AccountOverlay/overlay-sections";

/**
 * A drawer navigation row, styled to match DashboardNav's items: muted icon and label
 * that lift to foreground on hover, a muted pill plus a 3px primary accent bar when active.
 *
 * Active state is worth having even though the drawer closes on selection — you see it on
 * *reopen*, which is when you're orienting yourself. It's driven by NavLink's own `isActive`,
 * so there's no duplicated route state to keep in sync.
 */
const rowClasses = (isActive: boolean) =>
  cn(
    "group relative flex w-full items-center rounded-lg px-3 py-2 outline-none transition-colors",
    "focus-visible:ring-1 focus-visible:ring-ring",
    !isActive && "hover:bg-muted/60"
  );

const iconClasses = (isActive: boolean) =>
  cn(
    "relative z-10 h-[18px] w-[18px] shrink-0 transition-colors",
    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
  );

const labelClasses = (isActive: boolean) =>
  cn(
    "relative z-10 ml-3 truncate text-[13px] font-medium transition-colors",
    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
  );

/** The active pill + accent bar. Static (no layoutId): the drawer unmounts between
 *  openings, so a shared-layout animation would have nothing to animate from. */
const ActiveDecoration = () => (
  <>
    <span className="absolute inset-0 rounded-lg bg-muted" />
    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
  </>
);

type DrawerNavLinkProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  close: () => void;
  /** Match this path exactly — needed for parent routes like /my-dashboard. */
  end?: boolean;
};

const DrawerNavLink = ({
  to,
  icon: Icon,
  label,
  close,
  end,
}: DrawerNavLinkProps) => (
  <NavLink to={to} end={end} onClick={close} className="w-full">
    {({ isActive }) => (
      <span className={rowClasses(isActive)} aria-current={isActive ? "page" : undefined}>
        {isActive && <ActiveDecoration />}
        <Icon size={18} strokeWidth={1.75} className={iconClasses(isActive)} />
        <span className={labelClasses(isActive)}>{label}</span>
      </span>
    )}
  </NavLink>
);

export const DrawerLinks = ({
  close,
  isAdmin,
}: {
  close: () => void;
  isAdmin: boolean;
}) => {
  const { open: openAccountOverlay } = useAccountOverlay();

  // Profile and Settings open the account overlay on top of the current page rather
  // than navigating into the dashboard — checking your profile shouldn't drop you into
  // a different section of the app. See use-account-overlay.ts.
  const openOverlay = (section: OverlaySectionId) => {
    close();
    openAccountOverlay(section);
  };

  return (
  <nav aria-label="Account" className="mt-2 flex flex-col gap-0.5 px-1">
    <button
      type="button"
      onClick={() => openOverlay("account")}
      className={rowClasses(false)}
    >
      <CircleUser size={18} strokeWidth={1.75} className={iconClasses(false)} />
      <span className={labelClasses(false)}>My Profile</span>
    </button>

    {/* Friends has no destination yet, so it renders as a button and never highlights. */}
    <button
      type="button"
      onClick={close}
      className={rowClasses(false)}
    >
      <Users size={18} strokeWidth={1.75} className={iconClasses(false)} />
      <span className={labelClasses(false)}>Friends</span>
    </button>

    <button
      type="button"
      onClick={() => openOverlay("appearance")}
      className={rowClasses(false)}
    >
      <Settings size={18} strokeWidth={1.75} className={iconClasses(false)} />
      <span className={labelClasses(false)}>Settings</span>
    </button>

    {/* The dashboard is still a real page — questions, quizzes and reports live there. */}
    <DrawerNavLink
      to="/my-dashboard"
      icon={LayoutDashboard}
      label="Dashboard"
      close={close}
      end
    />

    {/* Admins additionally get the admin dashboard. */}
    {isAdmin && (
      <DrawerNavLink
        to="/dashboard"
        icon={ShieldCheck}
        label="Admin Dashboard"
        close={close}
      />
    )}
  </nav>
  );
};
