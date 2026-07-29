// Uniform outline icon set (lucide-react) — consistent stroke weight across
// the whole sidebar, matching the premium Cloudflare / GitHub look.
import {
  LineChart,
  Folder,
  MessageSquareText,
  Users,
  Lock,
  Ticket,
  History,
  Tag,
  Signal,
  Languages,
} from "lucide-react";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  /**
   * Optional section this item belongs to. Items that share a `group` are
   * rendered together under a small section label (Cloudflare / GitHub style).
   * Items without a group fall into the leading, unlabelled section.
   */
  group?: string;
};

// Admin / SuperAdmin dashboard (/dashboard)
export const adminDashboardNavButtons: DashboardNavItem[] = [
  {
    id: "application",
    label: "Application",
    icon: LineChart,
    roles: ["Admin", "SuperAdmin"],
    group: "Overview",
  },
  {
    id: "quizzes",
    label: "Quizzes",
    icon: Folder,
    group: "Overview",
  },
  {
    id: "questions",
    label: "Questions",
    icon: MessageSquareText,
    group: "Overview",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    roles: ["Admin", "SuperAdmin"],
    group: "Access",
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: Lock,
    roles: ["SuperAdmin"],
    group: "Access",
  },
  {
    id: "invite-codes",
    label: "Invite Codes",
    icon: Ticket,
    roles: ["Admin", "SuperAdmin"],
    group: "Access",
  },
  {
    id: "audit-logs",
    label: "Audit Log",
    icon: History,
    roles: ["Admin", "SuperAdmin"],
    group: "System",
  },
  {
    id: "categories",
    label: "Categories",
    icon: Tag,
    roles: ["Admin", "SuperAdmin"],
    group: "System",
  },
  {
    id: "difficulties",
    label: "Difficulties",
    icon: Signal,
    roles: ["Admin", "SuperAdmin"],
    group: "System",
  },
  {
    id: "languages",
    label: "Languages",
    icon: Languages,
    roles: ["Admin", "SuperAdmin"],
    group: "System",
  },
];

// Regular-user dashboard (/my-dashboard). No `roles` -> always visible.
// Profile and Settings deliberately absent: they live in the account overlay now
// (docs/development/account-overlay.md), reachable from the header drawer on any page. The
// dashboard keeps only what is genuinely a workspace — your content and its reports.
export const userDashboardNavButtons: DashboardNavItem[] = [
  {
    id: "quizzes",
    label: "My Quizzes",
    icon: Folder,
    group: "Overview",
  },
  {
    id: "questions",
    label: "My Questions",
    icon: MessageSquareText,
    group: "Overview",
  },
  {
    id: "reports",
    label: "Reports",
    icon: LineChart,
    group: "Overview",
  },
];
