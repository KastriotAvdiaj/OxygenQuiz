
import { FaChartLine } from "react-icons/fa6";
import { RiQuestionAnswerFill } from "react-icons/ri";
import { FaFolderOpen, FaUsers } from "react-icons/fa";
import { PiLockKeyFill } from "react-icons/pi";

export const dashboardNavButtons = [
  {
    id: "application",
    label: "Application",
    icon: FaChartLine,
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
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: PiLockKeyFill,
  }
];
