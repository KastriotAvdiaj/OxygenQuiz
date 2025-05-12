import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Divider } from "../../../common/Divider";
import { dashboardNavButtons } from "./dashboardNavConfig";

type DashboardNavProps = {
  setActivePage: (page: string) => void;
  activePage: string;
  isCollapsed?: boolean;
  setIsCollapsed?: (isCollapsed: boolean) => void;
};

export const DashboardNav: React.FC<DashboardNavProps> = ({
  setActivePage,
  activePage,
  isCollapsed = false,
  setIsCollapsed = () => {},
}) => {
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`relative transition-all duration-300 ease-in ${
        isCollapsed ? "w-16" : "w-full"
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleCollapse}
        className="absolute -right-3 top-0 rounded-full bg-background shadow-md border border-gray-200 p-1 h-6 w-6"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </Button>

      <ul className="bg-background w-full mt-8 px-3 text-lg flex flex-col gap-2">
        <div className="flex items-center justify-between px-1 mb-2">
          {!isCollapsed && <p className="text-gray-400">Menu</p>}
        </div>
        <Divider color="gray" />

        {dashboardNavButtons.map((button) => (
          <Button
            key={button.id}
            variant={"dashboard"}
            size={"dashboard"}
            className={`mt-2 ${isCollapsed ? "justify-center" : ""}`}
            onClick={() => setActivePage(button.id)}
            active={activePage === button.id}
          >
            <button.icon />
            {!isCollapsed && <span className="ml-2">{button.label}</span>}
          </Button>
        ))}
      </ul>
    </div>
  );
};

export default DashboardNav;
