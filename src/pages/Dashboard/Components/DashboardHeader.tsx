import { DrawerFilled } from "@/common/DrawerFilled";
import { Divider } from "@/common/Divider";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { HeaderComponent } from "@/common/HeaderComponent";
import { NavLink } from "react-router-dom";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DashboardHeader = () => {
  return (
    <HeaderComponent className="">
      <div className="flex flex-col items-center p-2">
        <p className="text-5xl font-bold pt-3 px-6 italic">OXYGEN</p>
        {/* <p className="text-2xl">Dashboard</p>  */}
      </div>
      <div className="px-4 flex justify-end items-center gap-3">
        <NavLink to="/">
          <Button variant={"outline"} className="rounded-[0.2rem]  ">
            <Undo2 size={20} /> Back
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
