import { Button } from "@/components/ui/button";
import { Divider } from "../../../componentsOurs/Divider";
import { dashboardNavButtons } from "./dashboardNavConfig";

type DashboardNavProps = {
  setActivePage: (page: string) => void;
  activePage: string;
};

export const DashboardNav: React.FC<DashboardNavProps> = ({
  setActivePage,
  activePage,
}) => {
  return (
    <ul className="w-full mt-8 px-3 text-lg flex flex-col gap-2">
      <p className="px-1 text-gray-400 mb-2">Menu</p>
      <Divider color="gray" />

      {dashboardNavButtons.map((button) => (
        <Button
          key={button.id}
          variant={"dashboard"}
          size={"dashboard"}
          className="mt-2"
          onClick={() => setActivePage(button.id)}
          active={activePage === button.id}
        >
          <button.icon />
          {button.label}
        </Button>
      ))}
    </ul>
  );
};
