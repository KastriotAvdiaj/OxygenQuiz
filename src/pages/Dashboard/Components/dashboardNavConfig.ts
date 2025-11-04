import { FaChartLine } from "react-icons/fa6";
import { RiQuestionAnswerFill } from "react-icons/ri";
import { FaFolderOpen, FaUsers } from "react-icons/fa";
import { PiLockKeyFill } from "react-icons/pi";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
};

export const dashboardNavButtons: DashboardNavItem[] = [
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
];
