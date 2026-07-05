import { FaChartLine } from "react-icons/fa6";
import { RiQuestionAnswerFill } from "react-icons/ri";
import { FaFolderOpen, FaUsers, FaUserCircle, FaCog, FaHistory, FaTags, FaLanguage, FaSignal, FaTicketAlt } from "react-icons/fa";
import { PiLockKeyFill } from "react-icons/pi";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
};

// Admin / SuperAdmin dashboard (/dashboard)
export const adminDashboardNavButtons: DashboardNavItem[] = [
  {
    id: "application",
    label: "Application",
    icon: FaChartLine,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "questions",
    label: "Questions",
    icon: RiQuestionAnswerFill,
  },
  {
    id: "categories",
    label: "Categories",
    icon: FaTags,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "difficulties",
    label: "Difficulties",
    icon: FaSignal,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "languages",
    label: "Languages",
    icon: FaLanguage,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "quizzes",
    label: "Quizzes",
    icon: FaFolderOpen,
  },
  {
    id: "users",
    label: "Users",
    icon: FaUsers,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: PiLockKeyFill,
    roles: ["SuperAdmin"],
  },
  {
    id: "invite-codes",
    label: "Invite Codes",
    icon: FaTicketAlt,
    roles: ["Admin", "SuperAdmin"],
  },
  {
    id: "audit-logs",
    label: "Audit Log",
    icon: FaHistory,
    roles: ["Admin", "SuperAdmin"],
  },
];

// Regular-user dashboard (/my-dashboard). No `roles` → always visible.
export const userDashboardNavButtons: DashboardNavItem[] = [
  {
    id: "profile",
    label: "Profile",
    icon: FaUserCircle,
  },
  {
    id: "questions",
    label: "My Questions",
    icon: RiQuestionAnswerFill,
  },
  {
    id: "quizzes",
    label: "My Quizzes",
    icon: FaFolderOpen,
  },
  {
    id: "reports",
    label: "Reports",
    icon: FaChartLine,
  },
  {
    id: "settings",
    label: "Settings",
    icon: FaCog,
  },
];
