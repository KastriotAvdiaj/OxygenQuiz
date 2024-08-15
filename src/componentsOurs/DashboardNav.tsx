import { Button } from "@/components/ui/button";
import { FaChartLine } from "react-icons/fa6";
import { RiQuestionAnswerFill } from "react-icons/ri";
import { FaFolderOpen } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { Divider } from "./Divider";

type DashboardNavProps = {
  setActivePage: (page: string) => void;
};

export const DashboardNav: React.FC<DashboardNavProps> = ({ setActivePage }) => {
  return (
    <ul className="w-full px-3 text-lg flex flex-col gap-2">
      <p className="px-1 text-gray-400 mb-2">Menu</p>
      <Divider color="gray" />
      <Button
        variant={"dashboard"}
        size={"dashboard"}
        className="mt-2"
        onClick={() => setActivePage("Application")}
      >
        <FaChartLine />
        Application
      </Button>
      <Button
        variant={"dashboard"}
        size={"dashboard"}
        onClick={() => setActivePage("Questions")}
      >
        <RiQuestionAnswerFill />
        Questions
      </Button>
      <Button
        variant={"dashboard"}
        size={"dashboard"}
        onClick={() => setActivePage("Quizzes")}
      >
        <FaFolderOpen />
        Quizzes
      </Button>
      <Button
        variant={"dashboard"}
        size={"dashboard"}
        onClick={() => setActivePage("Users")}
      >
        <FaUsers />
        Users
      </Button>
    </ul>
  );
};

