import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CgProfile } from "react-icons/cg";
import { LiaUserFriendsSolid } from "react-icons/lia";
import { Settings } from "lucide-react";
import { RiAdminFill } from "react-icons/ri";
import { MdSpaceDashboard } from "react-icons/md";

export const DrawerLinks = ({
  close,
  isAdmin,
}: {
  close: () => void;
  isAdmin: boolean;
}) => (
  <>
    <NavLink to={"/my-dashboard/profile"} onClick={close} className="w-full">
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

    <NavLink to={"/my-dashboard/settings"} onClick={close} className="w-full">
      <Button variant={"drawer"} size={"drawerSize"} className="w-full">
        <Settings className="text-sm" size={14} /> Settings
      </Button>
    </NavLink>

    {/* Every logged-in user has a personal dashboard. */}
    <NavLink to="/my-dashboard" onClick={close} className="w-full">
      <Button variant={"drawer"} size={"drawerSize"} className="w-full">
        <MdSpaceDashboard className="text-sm" /> Dashboard
      </Button>
    </NavLink>

    {/* Admins additionally get the admin dashboard. */}
    {isAdmin && (
      <NavLink to="/dashboard" onClick={close} className="w-full">
        <Button variant={"drawer"} size={"drawerSize"} className="w-full">
          <RiAdminFill className="text-sm" /> Admin Dashboard
        </Button>
      </NavLink>
    )}
  </>
);
