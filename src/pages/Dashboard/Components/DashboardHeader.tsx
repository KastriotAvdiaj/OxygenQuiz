import { DrawerFilled } from "@/componentsOurs/DrawerFilled";
import { HeaderComponent } from "@/componentsOurs/HeaderComponent";

export const DashboardHeader = () => {
  return (
    <HeaderComponent className="">
      <div className="flex flex-col items-center">
        <p className="text-5xl font-bold pt-3 px-6 italic">OXYGEN</p>
        <p className="text-2xl">Dashboard</p>
      </div>
      <div className="px-4">
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};
