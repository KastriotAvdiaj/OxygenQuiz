import { Button } from "@/components/ui/button";
import { FaChartLine } from "react-icons/fa6";
import { RiQuestionAnswerFill } from "react-icons/ri";
import { FaFolderOpen } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { Divider } from "./Divider";

export const DashboardNav = () => {
  return (
    <ul className="w-full px-3 text-lg flex flex-col gap-2">
      <p className="px-1 text-gray-400 mb-2">Menu</p>
      <Divider color="gray" />
      <Button variant={"dashboard"} size={"dashboard"} className="mt-2">
        <FaChartLine />
        Application
      </Button>
      <Button variant={"dashboard"} size={"dashboard"} className="">
        <RiQuestionAnswerFill />
        Questions
      </Button>
      <Button variant={"dashboard"} size={"dashboard"} className="">
        <FaFolderOpen />
        Quizes
      </Button>
      <Button variant={"dashboard"} size={"dashboard"} className="">
        <FaUsers />
        Users
      </Button>
    </ul>
  );
};
