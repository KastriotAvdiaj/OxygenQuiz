import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useUser } from "@/lib/Auth";
import { useLogout } from "@/lib/Auth";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ProfileButton } from "./profile-button";
import { DrawerHeaderContent } from "./drawer-header";
import { DrawerLinks } from "./drawer.links";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import { NavLink } from "react-router-dom";

export const DrawerFilled = () => {
  const isAdmin = true;
  const { data: user } = useUser();
  const logout = useLogout();
  const { isOpen, close, toggle } = useDisclosure();

  return (
    <>
      {user ? (
        <Drawer open={isOpen} onOpenChange={toggle}>
          <DrawerTrigger asChild>
            <ProfileButton />
          </DrawerTrigger>
          <DrawerContent className="bg-background text-foreground w-[200px] flex flex-col justify-between">
            <DrawerHeader>
              <DrawerHeaderContent />
              <DrawerLinks close={close} isAdmin={isAdmin} />
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button
                  className="rounded hover:bg-[#FE2A2A] hover:text-white w-full"
                  onClick={() => {
                    logout.mutate({});
                    close();
                  }}
                  variant="outline">
                  Logout
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <div className="flex gap-4 items-center text-foreground">
          <NavLink to={"/login"}>
            <Button
              className="bg-[#4B3EF3] text-white custom-button"
              variant={"default"}>
              Login
            </Button>
          </NavLink>
          or
          <NavLink to={"/signup"}>
            <Button variant={"outline"}>Signup</Button>
          </NavLink>
        </div>
      )}
    </>
  );
};
