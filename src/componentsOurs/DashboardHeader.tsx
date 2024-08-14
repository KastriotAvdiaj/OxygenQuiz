
import { DrawerFilled } from "./DrawerFilled";
export const DashboardHeader = () => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col items-center">
        <p className="text-5xl text-white font-bold pt-3 px-6 italic">OXYGEN</p>
        <p className="text-2xl text-white ">Dashboard</p>
      </div>
      <div className="px-4">
        <DrawerFilled />
      </div>
    </div>
  );
};
