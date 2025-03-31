import { DrawerFilled } from "@/common/Custom-Drawer/DrawerFilled";
import { Divider } from "@/common/Divider";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { HeaderComponent } from "@/common/HeaderComponent";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DashboardHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    if (location.pathname.includes("redirect")) {
      navigate(-2);
    } else {
      navigate(-1);
    }
  };

  return (
    <HeaderComponent className="shadow-md z-8 relative">
      <div className="flex flex-col items-center p-2">
        <p className="text-foreground text-5xl font-bold pt-3 px-6 italic">
          OXYGEN
        </p>
        {/* <p className="text-2xl">Dashboard</p>  */}
      </div>
      <div className="bg-background px-4 flex justify-end items-center gap-3">
        <Button
          variant={"outline"}
          className="rounded-[0.2rem]"
          onClick={goBack}
        >
          <Undo2 size={20} /> Back
        </Button>
        <NavLink to="/">
          <Button variant={"outline"}>
            <Home size={20} />
            Home
          </Button>
        </NavLink>

        <Divider orientation="vertical" thickness="1px" length="24px" />
        <ModeToggle className="rounded-[2rem] px-2" />
        <Divider orientation="vertical" thickness="1px" length="24px" />
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};
