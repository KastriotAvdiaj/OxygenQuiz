import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Divider } from "./Divider";
import { RiDashboard2Fill } from "react-icons/ri";
import { IoSettings } from "react-icons/io5";
import { LiaUserFriendsSolid } from "react-icons/lia";
import { NavLink } from "react-router-dom";
import { CgProfile } from "react-icons/cg";


export const DrawerFilled = () => {
  const isAdmin = true;
  const [signedIn, setSignedIn] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };
  return (
    <>
      {signedIn ? (
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant={"default"}
              size={"none"}
              className="flex items-center gap-3 py-2 h-12 px-4 shadow-[0px_0px_10px_0px_rgba(0,0,0,0.2)] hover:ring-1 hover:ring-white"
            >
              My Profile
              <Avatar className="cursor-pointer">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <div className="flex justify-start gap-4 items-center font-bold mb-6 ">
                <Avatar className="cursor-pointer ">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                Username
              </div>
              <Divider
                orientation="horizontal"
                thickness="2px"
                color="white"
                length="100%"
              />

              <Button
                variant={"drawer"}
                size={"drawerSize"}
                className="mt-6 w-full"
                onClick={handleDrawerClose}
              >
                <CgProfile className="text-sm" /> Your Profile
              </Button>
              <Button
                variant={"drawer"}
                size={"drawerSize"}
                className="w-full"
                onClick={handleDrawerClose}
              >
                <LiaUserFriendsSolid className="text-sm" /> Friends
              </Button>
              <Button
                variant={"drawer"}
                size={"drawerSize"}
                className="w-full"
                onClick={handleDrawerClose}
              >
                <IoSettings className="text-sm" /> Settings
              </Button>
              {isAdmin && (
                <NavLink
                  className="w-full"
                  to="/dashboard"
                  onClick={handleDrawerClose}
                >
                  <Button
                    variant={"drawer"}
                    size={"drawerSize"}
                    className="w-full"
                  >
                    <RiDashboard2Fill className="text-sm" /> Dashboard
                  </Button>
                </NavLink>
              )}
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button
                  className="rounded hover:bg-[#FE2A2A]"
                  onClick={() => {
                    setSignedIn(false);
                    // handleDrawerClose();
                  }}
                  variant="outline"
                >
                  Logout
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <div className="flex gap-4 items-center">
          <Button
            onClick={() => setSignedIn(true)}
            className="bg-[#0E2178]"
            variant={"default"}
          >
            Login
          </Button>
          or
          <Button variant={"outline"}>Signup</Button>
        </div>
      )}
    </>
  );
};
