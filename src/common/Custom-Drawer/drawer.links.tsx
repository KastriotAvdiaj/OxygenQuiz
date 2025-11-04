import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CgProfile } from "react-icons/cg";
import { LiaUserFriendsSolid } from "react-icons/lia";
import { Settings } from "lucide-react";
import { RiDashboard2Fill } from "react-icons/ri";

export const DrawerLinks = ({
  close,
  isAdmin,
}: {
  close: () => void;
  isAdmin: boolean;
}) => (
  <>
    <NavLink to={"/my-profile"} onClick={close} className="w-full">
      <Button variant={"drawer"} size={"drawerSize"} className="mt-6 w-full">
        <CgProfile className="text-sm" /> My Profile
      </Button>
    </NavLink>

    <Button
      variant={"drawer"}
      size={"drawerSize"}
      className="w-full"
      onClick={close}>
      <LiaUserFriendsSolid className="text-sm" /> Friends
    </Button>

    <NavLink to={"/settings"} onClick={close} className="w-full">
      <Button variant={"drawer"} size={"drawerSize"} className="w-full">
        <Settings className="text-sm" size={14} /> Settings
      </Button>
    </NavLink>

    {isAdmin && (
      <NavLink to="/go/dashboard" onClick={close} className="w-full">
        <Button variant={"drawer"} size={"drawerSize"} className="w-full">
          <RiDashboard2Fill className="text-sm" /> Dashboard
        </Button>
      </NavLink>
    )}
  </>
);
