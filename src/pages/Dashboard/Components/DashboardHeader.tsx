import { DrawerFilled } from "@/componentsOurs/DrawerFilled";
import { Divider } from "@/componentsOurs/Divider";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { HeaderComponent } from "@/componentsOurs/HeaderComponent";

export const DashboardHeader = () => {
  return (
    <HeaderComponent className="">
      <div className="flex flex-col items-center p-2">
        <p className="text-5xl font-bold pt-3 px-6 italic">OXYGEN</p>
        {/* <p className="text-2xl">Dashboard</p>  */}
      </div>
      <div className="px-4 flex justify-end items-center gap-3">
        <ModeToggle className="rounded-[2rem] px-2" />
        <Divider orientation="vertical" thickness="1px" length="24px" />
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};
